import { LightningElement, track, wire , api } from 'lwc';
import { loadScript, loadStyle } from 'lightning/platformResourceLoader';
import datatables from '@salesforce/resourceUrl/datatables';
import jquery from '@salesforce/resourceUrl/jquery';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import FONT_AWESOME from '@salesforce/resourceUrl/fontawesome';

// import class
import fetchCustomers from '@salesforce/apex/INID_OrderTest.fetchCustomers';
import fetchDataBillto from '@salesforce/apex/INID_OrderTest.fetchDataBillto';
import fetchDataShipto from '@salesforce/apex/INID_OrderTest.fetchDataShipto';
import fetchDataProductPriceBook from '@salesforce/apex/INID_OrderTest.fetchDataProductPriceBook'
// import fetchDataProduct from '@salesforce/apex/Test'


// import getRecord API
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import PAYMENT_TYPE_FIELD from '@salesforce/schema/Account.Payment_type__c';
import PAYMENT_TERM_FIELD from '@salesforce/schema/Account.Payment_term__c';
import INID_Organization__c from '@salesforce/schema/Account.INID_Organization__c';

export default class InidQuotation extends LightningElement {

    @track filteredCustomerOptions = [];
    @track searchTerm = '';
    @track showDropdown = false;
    @track customerId = ''

    @track paymentTypeValue = '';
    @track paymentTermValue = '';
    @track organizationValue = '';
    @track billto = '';
    @track shipto = '';

    @api recordId;

    // Call Apex Method HERE
    // fetch Customer
    @track accounts = [];

    @wire(fetchCustomers)
    wiredAccounts({ error, data }) {
        if (data) {
            this.accounts = data;
        } else if (error) {
            console.error('Error fetching accounts:', error);
        }
    }

     // fetch Auto Field Bill To
    @wire(fetchDataBillto)
    fetchBillTo(accountId) {
        fetchDataBillto({ accountId: accountId })
        .then(data => {
            if (data && data.length > 0) {
                const record = data[0];
                this.billto = `${record.Name} `;
                // this.shipto = record.Name;
            } else {
                this.billto = '';
                this.shipto = '';
            }
        })
        .catch(error => {
            console.error('Error fetching BillTo/ShipTo:', error);
        });
    }


    // fetch Auto Field Ship To 
    @track shipto = ''; 
    @track shiptoOptions = []; 

    @wire(fetchDataShipto)
    fetchShipto(accountId) {
        fetchDataShipto({ accountId: accountId })
        .then(data => {
             if (data && data.length > 0) {
                this.shiptoOptions = data.map(addr => ({
                    label: addr.Name,
                    value: addr.Id
                }));

                // ตั้งค่า default เป็นตัวแรก
                this.shipto = data[0].Id;
            } else {
                this.shiptoOptions = [];
                this.shipto = '';
            }
        })
        .catch(error => {
            console.error('Error fetching ShipTo options:', error);
        });
    }

    // Fetch Data Price Book
    @track productPriceBook = [] ;

    @wire(fetchDataProductPriceBook)
    wiredproductPriceBook({ error, data }) {
        if (data) {
            this.productPriceBook = data;
            //  alert('Fetched Products:\n' + JSON.stringify(this.productPriceBook, null, 2));
        } else if (error) {
            console.error('Error fetching accounts:', error);
        }
    }


    get billToCodes() {
        return this.addressRecords?.data?.map(addr => addr.INID_Bill_To_Code__c) || [];
    }

    handleInput(event) {
        const input = event.target.value;
        this.searchTerm = input;
        
        console.log('Search term:', input);
        
        const term = input.toLowerCase().trim();

        if (term.length > 2) {
            this.filteredCustomerOptions = this.accounts.filter(cust =>
                (cust.Name && cust.Name.toLowerCase().includes(term)) ||
                (cust.INID_Customer_Code__c && cust.INID_Customer_Code__c.toLowerCase().includes(term))
            );

            // แสดง dropdown เฉพาะกรณีมีข้อมูล
            this.showDropdown = this.filteredCustomerOptions.length > 0;
        } else {
            this.filteredCustomerOptions = [];
            this.showDropdown = false;
        }
    }

    handleSelectCustomer(event) {
        const selectedId = event.currentTarget.dataset.id;
        const selectedName = event.currentTarget.dataset.name;
        const selectedCode = event.currentTarget.dataset.code; 
        this.customerId = selectedId;
        this.searchTerm = `${selectedCode} ${selectedName}`;
        this.showDropdown = false;

        this.recordId = selectedId;
        this.fetchBillTo(selectedId);
        this.fetchShipto(selectedId);
    }

    handleBlur() {
        setTimeout(() => {
            this.showDropdown = false;
        }, 200); 
    }

    //End get Apex Class

    // --------------------------------------------------------------------------------
    
    //getRecord 
    @wire(getRecord, {
        recordId: "$recordId",
        fields: [PAYMENT_TYPE_FIELD, PAYMENT_TERM_FIELD, INID_Organization__c]
    })
    fetchOrder({ error, data }) {
        if (data) {
            const fetchedPaymentType = getFieldValue(data, PAYMENT_TYPE_FIELD);
            const fetchedPaymentTerm = getFieldValue(data, PAYMENT_TERM_FIELD);
            const fetchedOrganization = getFieldValue(data, INID_Organization__c);

            // ตรวจสอบว่า paymentType ที่ได้มาอยู่ในตัวเลือกหรือไม่
            const isValidPaymentType = this.paymentTypeOption.some(opt => opt.value === fetchedPaymentType);
            this.paymentTypeValue = isValidPaymentType ? fetchedPaymentType : '';

            // ตรวจสอบว่า paymentTerm ที่ได้มาอยู่ในตัวเลือกหรือไม่
            const isValidPaymentTerm = this.paymentTermOption.some(opt => opt.value === fetchedPaymentTerm);
            this.paymentTermValue = isValidPaymentTerm ? fetchedPaymentTerm : '';

            const isValidOrganization = this.organizationOption.some(opt => opt.value === fetchedOrganization);
            this.organizationValue = isValidOrganization ? fetchedOrganization : '';

        }

    if (error) {
        
    }
}
    // End Get Record

    // Call Font Awesome
    connectedCallback() {
        loadStyle(this, FONT_AWESOME + '/css/all.min.css');
    }

    // ---------------------------------------------------------------------------
    // Start: Order Form - Customer & Payment Info
    // ---------------------------------------------------------------------------

    @track billto = '';
    @track shipto = '';
    @track purchaseQuotationNumber = '';
    @track noteAgent = '';
    @track noteInternal = '';
    @track organizationValue = '';
    radioButtonOrderLabel1 = 'Include VAT';
    radioButtonOrderLabel2 = 'Exclude VAT';

    @track paymentTypeOptions = [];
    @track paymentTermOptions = [];
    @track value = [];

    get organizationOption() {
        return [
            { value: '1001-MEDLINE', label: '1001-MEDLINE' },
            { value: '2001-UNISON', label: '2001-UNISON' },
            { value: '3001-F.C.P.', label: '3001-F.C.P.' }
        ];
    }

    get paymentTypeOption() {
        return [
            { value: 'Cash', label: 'Cash' },
            { value: 'Credit', label: 'Credit' }
        ];
    }

    get paymentTermOption() {
        return [
            { value: 'CH40 - CHQ (40% UPON CONFIRMATION ORDER AND 60% 90D)', label: 'CH40 - CHQ (40% UPON CONFIRMATION ORDER AND 60% 90D)' },
            { value: 'CH50 - CHQ (50% UPON CONFIRMATION ORDER AND 50% 90D)', label: 'CH50 - CHQ (50% UPON CONFIRMATION ORDER AND 50% 90D)' },
            { value: 'N000 - Immediately', label: 'N000 - Immediately' },
            { value: 'N001 - Within 1 Day Due Net', label: 'N001 - Within 1 Day Due Net' },
            { value: 'N004 - Within 4 Days Due Net', label: 'N004 - Within 4 Days Due Net' },
            { value: 'N005 - Within 5 Days Due Net', label: 'N005 - Within 5 Days Due Net' },
            { value: 'N007 - Within 7 Days Due Net', label: 'N007 - Within 7 Days Due Net' },
            { value: 'N010 - Within 10 Days Due Net', label: 'N010 - Within 10 Days Due Net' },
            { value: 'N012 - Within 12 Days Due Net', label: 'N012 - Within 12 Days Due Net' },
            { value: 'N015 - Within 15 Days Due Net', label: 'N015 - Within 15 Days Due Net' },
            { value: 'N017 - Within 17 Days Due Net', label: 'N017 - Within 17 Days Due Net' },
            { value: 'N020 - Within 20 Days Due Net', label: 'N020 - Within 20 Days Due Net' },
            { value: 'N021 - Within 21 Days Due Net', label: 'N021 - Within 21 Days Due Net' },
            { value: 'N025 - Within 25 Days Due Net', label: 'N025 - Within 25 Days Due Net' },
            { value: 'N030 - Within 30 Days Due Net', label: 'N030 - Within 30 Days Due Net' },
            { value: 'Within 35 Days Due Net', label: 'N035 - Within 35 Days Due Net' },
            { value: 'N040 - Within 40 Days Due Net', label: 'N040 - Within 40 Days Due Net' },
            { value: 'N045 - Within 45 Days Due Net', label: 'N045 - Within 45 Days Due Net' },
            { value: 'N050 - Within 50 Days Due Net', label: 'N050 - Within 50 Days Due Net' },
            { value: 'N060 - Within 60 Days Due Net', label: 'N060 - Within 60 Days Due Net' },
            { value: 'N063 - Within 63 Days Due Net', label: 'N063 - Within 63 Days Due Net' },
            { value: 'N090 - Within 90 Days Due Net', label: 'N090 - Within 90 Days Due Net' },
            { value: 'N120 - Within 120 Days Due Net', label: 'N120 - Within 120 Days Due Net' },
            { value: 'N180 - Within 180 Days Due Net', label: 'N180 - Within 180 Days Due Net' },
            { value: 'N210 - Within 210 Days Due Net', label: 'N210 - Within 210 Days Due Net' },
            { value: 'V014 - Within 14 days Disc 2%', label: 'V014 - Within 14 days Disc 2%' },
            { value: 'ZB01 - Within 14 days Disc 3%, 30/2% due 45 day', label: 'ZB01 - Within 14 days Disc 3%, 30/2% due 45 day' },
            { value: 'ZB02 - Within 8 days Disc 5%, 14/2% due 21 day', label: 'ZB02 - Within 8 days Disc 5%, 14/2% due 21 day' },
            { value: 'ZB03 - Within 20 days Disc 2% due 30 day', label: 'ZB03 - Within 20 days Disc 2% due 30 day' },
            { value: 'Within 10 days Disc 4%, 20/2% due 30 day', label: 'ZB04 - Within 10 days Disc 4%, 20/2% due 30 day' },
            { value: 'ZB05 - Within 5 days Disc 2% due 10 day', label: 'ZB05 - Within 5 days Disc 2% due 10 day' }
        ];
    }

    get options() {
        return [
            { value: '1', label: 'Include VAT' },
            { value: '2', label: 'Exclude VAT' }
        ];
    }

    isShowAddProduct = false;
    isShowQuotation = true;

    handleChange(event) {
        const selected = event.target.value;
        const isChecked = event.target.checked;
        this.value = isChecked ? [...this.value, selected] : this.value.filter(val => val !== selected);
    }

    handleKeyUp(evt) {
        if (evt.keyCode === 13) {
            this.customers = evt.target.value;
        }
    }

    organizationHandleChange(event) {
        this.organizationValue = event.detail.value;
    }

    paymentTypeHandleChange(event) {
        this.paymentTypeValue = event.detail.value;
    }

    paymentTermHandleChange(event) {
        this.paymentTermValue = event.detail.value;
    }

    billtoHandleChange(event) {
        this.billto = event.detail.value ;
    }

    purchaseQuotationNumberHandleChange(event) {
        this.purchaseQuotationNumber = event.detail.value;
    }

    shiptoHandleChange(event) {
        this.shipto = event.detail.value;
    }

    //Validate
    validateOrder() {
    const allInputs = this.template.querySelectorAll(
        'lightning-input, lightning-combobox, lightning-textarea'
    );

    let isValid = true;
    let firstInvalid = null;

    allInputs.forEach(input => {
            if (!input.checkValidity()) {
                input.reportValidity();

            if (!firstInvalid) {
                firstInvalid = input;
            }

            isValid = false;
        }
    });

    if (!isValid && firstInvalid) {
        // เลื่อนไปและ focus เข้าไปที่ช่องแรกที่ error
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // ใส่ delay focus เพื่อให้ scroll เสร็จก่อน
        setTimeout(() => {
            firstInvalid.focus();
        }, 300);
    }
        return isValid;
    }


    openAddProduct() {
        if(!this.validateOrder()){
            return;
        }

        this.isShowAddProduct = true;
        this.isShowQuotation = false;
    
        setTimeout(() => {
            const table = this.template.querySelector('.product-table');
            if (!this.dataTableInstanceAddProduct && table) {
                Promise.all([
                    loadScript(this, jquery + '/jquery.min.js'),
                    loadScript(this, datatables + '/jquery.dataTables.min.js'),
                    loadStyle(this, datatables + '/jquery.dataTables.min.css')
                ])
                .then(() => {
                    this.initializeDataTable();
                    this.dataTableInstanceAddProduct = true;
                    this.updateDataTable();
                })
                .catch(error => console.error('DataTables Load Error:', error));
            } else if (this.dataTableInstance) {
                // this.dataTableInstanceAddProduct.clear().draw();
                this.updateDataTable();
            }
        }, 50); // wait for DOM to be visible
    }

    

    backtoQuotation() {
        this.isShowAddProduct = false;
        this.isShowQuotation = true;
        this.dataTableInstanceAddProduct = false; // ต้องให้มัน init ใหม่ตอนกลับมา
    }


    // ---------------------------------------------------------------------------
    // Start JS Add Product ------------------------------------------------------
    // ---------------------------------------------------------------------------

    @track selectedProducts = [];
    @track filteredProductOptions = [];
    @track showProductDropdown = false;
    @track searchProductTerm = '';

    dataTableInstance;
    datatableInitialized = false;

  //initializeDataTable method
    initializeDataTable() {
        const table = this.template.querySelector('.product-table');
        if (table) {
            this.dataTableInstance = $(table).DataTable({
                searching: false,
                paging: false,
                ordering: false,
                info: false,
                responsive: false,
                columnDefs: [
                    { targets: 0, width: '120px' },
                    { targets: 1, width: '200px' }
                ]
            });
        }
    }

    // กรองจากการ search input
    handleInputProduct(event) {
        this.searchProductTerm = event.target.value;
        const term = this.searchProductTerm.toLowerCase();
        this.showProductDropdown = term.length > 2;
        this.filteredProductOptions = this.productPriceBook.filter(p => {
            const nameStr = p.NameINID_SKU_Description__c ? p.INID_SKU_Description__c.toLowerCase() : '';
            const codeStr = p.INID_Material_Code__c ? p.INID_Material_Code__c.toString().toLowerCase() : '';

            return nameStr.includes(term) || codeStr.includes(term);
        });
    }
    
    //Select Product In Table 
    handleSelectProduct(event) {
        const id = event.currentTarget.dataset.id;
        const existing = this.selectedProducts.find(p => p.id === id);

        if (!existing) {
            const selected = this.productPriceBook.find(p => p.Id === id);
            if (selected) {
                const unitPrice = selected.INID_Unit_Price__c || 0;
                const quantity = selected.INID_Quantity__c;
                const total = unitPrice * quantity;

                const newProduct = {
                    id: selected.Id,
                    code: selected.INID_Material_Code__c,
                    Name: selected.Name,
                    description: selected.INID_SKU_Description__c,
                    quantity: quantity,
                    unit: selected.INID_Unit__c,
                    unitPrice: unitPrice,
                    total: total
                };
                this.selectedProducts = [...this.selectedProducts, newProduct];

                const relatedAddons = this.addonSelections?.filter(
                    a => a.id === id
                ).map(a => ({
                    id: id,
                    code: selected.INID_Material_Code__c,
                    description: a.addonDescription,
                    salePrice: 0,
                    quantity: 0,
                    unit: '-',
                    total: Number(a.discountValue || 0),
                    addonLabel: a.addonLabel
                })) || [];

                this.selectedProducts = [...this.selectedProducts, ...relatedAddons];

                this.dataTableInstance.clear();
                this.selectedProducts.forEach(product => {
                    const hasAddon = this.selectedProducts.some(
                        p => p.code === product.code && p.salePrice === 0
                    );

                    this.dataTableInstance.row.add([
                        `<input style="text-align: center;" type="checkbox" />`,
                        `<div style="text-align: left;">${product.code}</div>`,
                        `<div style="text-align: left;">${product.description}</div>`,
                        product.salePrice === 0 ? '-' : product.unitPrice.toFixed(2),
                        product.quantity,
                        `<div style="text-align: center;">${product.unit || '-'}</div>`,
                        product.total.toFixed(2),
                        // product.salePrice === 0
                        //     ? `<div style="text-align: center;">${product.addonLabel || '-'}</div>`
                        //     : `
                        //         <div style="display: flex; justify-content: center; align-items: center;">
                        //             <i class="fa-solid fa-plus addon-btn"
                        //                 style="width:30px;height:30px;border-radius:50%;border:1px solid #ccc;background:white;
                        //                     color:${hasAddon ? '#ccc' : '#007bff'};
                        //                     font-size:16px;display:flex;align-items:center;justify-content:center;
                        //                     cursor:${hasAddon ? 'not-allowed' : 'pointer'};"
                        //                 title="เพิ่มของแถม"
                        //                 data-id="${product.code}"
                        //                 ${hasAddon ? 'disabled' : ''}>
                        //             </i>
                        //         </div>
                        //     `
                    ]);
                });
                this.dataTableInstance.draw();
            }
        }

        this.searchProductTerm = '';
        this.showProductDropdown = false;
    }

    
    // ---------------------------------------------------------------------------
    // End JS Add Product --------------------------------------------------------
    // ---------------------------------------------------------------------------

    // ---------------------------------------------------------------------------
    // Start: Order Form - Product & Addon
    // ---------------------------------------------------------------------------

    @track isPopupOpenFreeGood = false;
    selectedValue = '';
    selectedLabel = '';
    @track currentMaterialCodeForAddOn = '';

    get options(){
        return [
            { label: 'ของแถม', value: '1' },
            { label: 'ตัวอย่าง', value: '2' },
            { label: 'บริจาค', value: '3' },
            { label: 'ชดเชย', value: '4' },
            { label: 'สมนาคุณ', value: '5' },
        ];
    }

    handleRemoveProduct(event) {
        const code = event.currentTarget.dataset.id;
        this.selectedProducts = this.selectedProducts.filter(p => p.materialCode !== code);
    }

    showPopupFreeGood(materialCode) {
        // alert(materialCode) ;
        this.currentMaterialCodeForAddOn = materialCode;
        this.isPopupOpenFreeGood = true;
    }

    closePopupFreeGood() {
        this.isPopupOpenFreeGood = false;
        this.selectedValue = '';
        this.selectedLabel = ''; 
        this.searchProductTermAddOn = '';   
    }

    handleChangeFreeGoods(event) {
        this.selectedValue = event.detail.value;
        this.selectedLabel = event.detail.label;
    }

    @track addonSelections = [];
    @track filteredProductOptionsAddOn = [];
    @track showProductDropdownAddOn = false;
    @track searchProductTermAddOn = '';
    @track selectedProductsAddOn = [];
    @track selectedAddOnProduct;


    handleSelectProductAddOn(event) {
        const materialCode = event.currentTarget.dataset.id;
        const selected = this.productPriceBook.find(p => p.INID_Material_Code__c === materialCode);
        if (selected) {
            this.selectedAddOnProduct.INID_Material_Code__c
            this.searchProductTermAddOn = `${selected.INID_Material_Code__c} ${selected.INID_SKU_Description__c}`;
            this.showProductDropdownAddOn = false;
        }
    }

    //handleSave Addon
    handleSave() {
        const errorCombobox = this.template.querySelector('[data-id="error-combobox"]');
        if (errorCombobox) errorCombobox.textContent = '';

        let hasError = false;

        if (!this.selectedValue) {
            if (errorCombobox) errorCombobox.textContent = 'โปรดระบุประเภทการ Add-on';
            hasError = true;
        }

        if (hasError) return;

        const matchedMainProduct = this.selectedProducts.find(
            p => String(p.code) === String(this.currentMaterialCodeForAddOn) && p.salePrice !== 0
        );

        const selectedOption = this.options.find(opt => opt.value === this.selectedValue);
        const addonLabel = selectedOption ? selectedOption.label : 'ของแถม';

        const isAlreadyUsed = this.addonSelections.some(
            a => a.productCode === this.currentMaterialCodeForAddOn && a.addonType === this.selectedValue
        );
        // const isAlreadyUsed = this.addonSelections.some(
        //     a => a.productCode === this.currentMaterialCodeForAddOn && a.addonType === this.selectedValue
        // );

        if (isAlreadyUsed) {
            alert('Add-on นี้ถูกเพิ่มแล้ว');
            return;
        }

        // ✅ Generate unique ID for Add-on
        // const addonId = `addon-${this.currentMaterialCodeForAddOn}-${Date.now()}`;
        // const addonId = `addon-${this.currentMaterialCodeForAddOn}-${Date.now()}`;
        const addonId = `${this.currentMaterialCodeForAddOn}`;

        const addonProduct = {
            code: addonId, // <-- unique ID
            materialCode: this.currentMaterialCodeForAddOn,
            description: matchedMainProduct.description,
            salePrice: 0.00,
            quantity: 1,
            unit: '',
            total: 0.00,
            addonLabel: addonLabel,
            isDiscount: false,
            productCode: this.currentMaterialCodeForAddOn // <-- bind to main
        };

        const mainIndex = this.selectedProducts.findIndex(
            p => String(p.code) === String(this.currentMaterialCodeForAddOn) && p.salePrice !== 0
        );

        if (mainIndex !== -1) {
            let insertIndex = mainIndex + 1;
            while (
                insertIndex < this.selectedProducts.length &&
                this.selectedProducts[insertIndex].salePrice === 0 &&
                this.selectedProducts[insertIndex].productCode === this.currentMaterialCodeForAddOn
            ) {
                insertIndex++;
            }

            const before = this.selectedProducts.slice(0, insertIndex);
            const after = this.selectedProducts.slice(insertIndex);
            this.selectedProducts = [...before, addonProduct, ...after];
        } else {
            this.selectedProducts = [...this.selectedProducts, addonProduct];
        }

        const record = {
            id: addonId,
            productCode: this.currentMaterialCodeForAddOn,
            productDescription: matchedMainProduct.description,
            addonType: this.selectedValue,
            addonLabel: addonLabel
        };

        this.addonSelections = [...this.addonSelections, record];

        this.updateDataTable();
        this.closePopupFreeGood();
        this.currentMaterialCodeForAddOn = null;
        this.selectedValue = '';
        // alert(
        // `Add-on ถูกเพิ่ม:\n` +
        // `รหัสสินค้า: ${addonProduct.materialCode}\n` +
        // `ชื่อสินค้า: ${addonProduct.description}\n` +
        // `ประเภทของแถม: ${record.addonType}\n` +
        // `ป้ายกำกับของแถม: ${record.addonLabel}\n` +
        // `จำนวน: ${addonProduct.quantity}`
        // );
    }

    //End Handle Save

    //Update Data Table
    updateDataTable() {
        if (!this.dataTableInstance) return;

        this.dataTableInstance.clear();

        if (this.isShowSummary) {
            const mainProducts = this.selectedProducts.filter(p => p.salePrice !== 0);

            mainProducts.forEach(main => {
                const relatedAddons = this.selectedProducts.filter(
                    p => p.productCode === main.code && p.salePrice === 0
                );

                const totalQty = (main.quantity || 0) + relatedAddons.reduce((sum, a) => sum + (a.quantity || 1), 0);
                const netPrice = totalQty > 0 ? (main.total || 0) / totalQty : 0;

                this.dataTableInstance.row.add([
                    `<div style="text-align: left;">${main.code || '-'}</div>`,
                    `<div style="text-align: left;">${main.description || '-'}</div>`,
                    `<div style="text-align: right;">${(main.unitPrice || 0).toFixed(2)}</div>`,
                    `<div style="text-align: right;">${main.quantity || '-'}</div>`,
                    `<div style="text-align: center;">${main.unit ?? '-'}</div>`,
                    `<div style="text-align: right;">${(main.total || 0).toFixed(2)}</div>`,
                    // `<div style="text-align: center;">${main.unit !== undefined && main.unit !== null ? main.unit : '-'}</div>`,
                    `<div style="text-align: right;">${netPrice.toFixed(2)}</div>`
                ]);

                relatedAddons.forEach(addon => {
                    this.dataTableInstance.row.add([
                        `<div style="text-align: left;">${addon.code || '-'}</div>`,
                        `<div style="text-align: left;">${addon.description || '-'}</div>`,
                        `<div style="text-align: right;">${(addon.unitPrice || 0).toFixed(2)}</div>`,
                        `<div style="text-align: right;">${addon.quantity || '-'}</div>`,
                        `<div style="text-align: center;">${main.unit ?? '-'}</div>`,
                        `<div style="text-align: right;">${(addon.total || 0).toFixed(2)}</div>`,
                        // `<div style="text-align: center;">${main.unit !== undefined && main.unit !== null ? main.unit : '-'}</div>`,
                        `<div style="text-align: right;"></div>`
                    ]);
                });
            });
        } else {
            this.selectedProducts.forEach((product, index) => {
                const isAddon = product.addonLabel !== undefined;
                const hasAddon = this.selectedProducts.some(
                    p => p.code === product.code && p.salePrice === 0
                );

                this.dataTableInstance.row.add([
                    `<input type="checkbox" style="text-align: center;" />`,
                    `<div style="text-align: left;">${product.code || '-'}</div>`,
                    `<div style="text-align: left;">${product.description || '-'}</div>`,
                    `<div style="text-align: right;">${(product.unitPrice || 0).toFixed(2)}</div>`,
                    `<div style="text-align: right;">${product.quantity || '-'}</div>`,
                    `<div style="text-align: center;">${product.unit || '-'}</div>`,
                    `<div style="text-align: right;">${(product.total || 0).toFixed(2)}</div>`,

                    // isAddon
                    //     ? `<div style="text-align: center;">${product.addonLabel || '-'}</div>`
                    //     : `<div style="display: flex; justify-content: center; align-items: center;">
                    //         <i class="fa-solid fa-plus addon-btn"
                    //             style="width:30px;height:30px;border-radius:50%;border:1px solid #ccc;background:white;
                    //                 color:${hasAddon ? '#ccc' : '#007bff'};
                    //                 font-size:16px;display:flex;align-items:center;justify-content:center;
                    //                 cursor:${hasAddon ? 'not-allowed' : 'pointer'};"
                    //             title="เพิ่มของแถม"
                    //             data-id="${product.code}"
                    //             ${hasAddon ? 'disabled' : ''}>
                    //         </i>
                    //     </div>`
                ]);
            });
        }

        this.dataTableInstance.draw();
    }

    // End Add On Section

    //handleDeleteSelected (set version)
    // handleDeleteSelected() {
    //     const table = this.template.querySelector('.product-table');
    //     const checkboxes = table.querySelectorAll('tbody input[type="checkbox"]:checked');

    //     const selectedMainCodes = new Set();
    //     const selectedAddonCodes = new Set();

    //     checkboxes.forEach(checkbox => {
    //         const row = checkbox.closest('tr');
    //         const rowData = this.dataTableInstance.row(row).data();

    //         const materialColumn = rowData[1];
    //         const matchMaterial = materialColumn.match(/>(.*?)</);
    //         const materialCode = matchMaterial ? matchMaterial[1].trim() : null;

    //         const unitPriceColumn = rowData[3];
    //         const matchUnitPrice = unitPriceColumn.match(/>(.*?)</);
    //         const unitPrice = matchUnitPrice ? parseFloat(matchUnitPrice[1].trim()) : null;

    //         if (materialCode !== null && unitPrice !== null) {
    //             if (unitPrice === 0) {
    //                 selectedAddonCodes.add(materialCode); // ติ๊ก Add-on
    //             } else {
    //                 selectedMainCodes.add(materialCode); // ติ๊ก Main
    //             }
    //         }
    //     });

    //     if (selectedMainCodes.size === 0 && selectedAddonCodes.size === 0) {
    //         alert('กรุณาเลือกรายการที่ต้องการลบ');
    //         return;
    //     }

    //     const confirmDelete = confirm('คุณต้องการลบรายการที่เลือกหรือไม่?');
    //     if (!confirmDelete) return;

    //     // ✅ ลบจาก selectedProducts
    //     this.selectedProducts = this.selectedProducts.filter(p => {
    //         const isMainSelected = selectedMainCodes.has(p.code) && p.salePrice !== 0;
    //         const isAddonSelected = selectedAddonCodes.has(p.code) && p.salePrice === 0;
    //         const isAddonOfSelectedMain = p.salePrice === 0 && selectedMainCodes.has(p.productCode);
    //         return !(isMainSelected || isAddonSelected || isAddonOfSelectedMain);
    //     });

    //     // ✅ ลบจาก addonSelections
    //     this.addonSelections = this.addonSelections.filter(a => {
    //         const isAddonSelected = selectedAddonCodes.has(a.id); // id === addonCode
    //         const isAddonOfSelectedMain = selectedMainCodes.has(a.productCode);
    //         return !(isAddonSelected || isAddonOfSelectedMain);
    //     });

    //     this.updateDataTable();
    // }


    // handleDeleteSelected (Array version)
    handleDeleteSelected() {
        const table = this.template.querySelector('.product-table');
        const checkboxes = table.querySelectorAll('tbody input[type="checkbox"]:checked');

        const selectedMainCodes = new Set();
        const selectedAddonCodes = new Set();

        checkboxes.forEach(checkbox => {
            const row = checkbox.closest('tr');
            const rowData = this.dataTableInstance.row(row).data();

            const materialColumn = rowData[1];
            const matchMaterial = materialColumn.match(/>(.*?)</);
            const materialCode = matchMaterial ? matchMaterial[1].trim() : null;

            const unitPriceColumn = rowData[3];
            const matchUnitPrice = unitPriceColumn.match(/>(.*?)</);
            const unitPrice = matchUnitPrice ? parseFloat(matchUnitPrice[1].trim()) : null;

            if (materialCode !== null && unitPrice !== null) {
                if (unitPrice === 0) {
                    selectedAddonCodes.add(materialCode); // ติ๊ก Add-on
                } else {
                    selectedMainCodes.add(materialCode); // ติ๊ก Main
                }
            }
        });

        if (selectedMainCodes.size === 0 && selectedAddonCodes.size === 0) {
            alert('กรุณาเลือกรายการที่ต้องการลบ');
            return;
        }

        const confirmDelete = confirm('คุณต้องการลบรายการที่เลือกหรือไม่?');
        if (!confirmDelete) return;

        // ✅ ลบจาก selectedProducts
        this.selectedProducts = this.selectedProducts.filter(p => {
            const isMainSelected = selectedMainCodes.has(p.code) && p.salePrice !== 0;
            const isAddonSelected = selectedAddonCodes.has(p.code) && p.salePrice === 0;
            const isAddonOfSelectedMain = p.salePrice === 0 && selectedMainCodes.has(p.productCode);
            return !(isMainSelected || isAddonSelected || isAddonOfSelectedMain);
        });

        // ✅ ลบจาก addonSelections
        this.addonSelections = this.addonSelections.filter(a => {
            const isAddonSelected = selectedAddonCodes.has(a.id); // id === addonCode
            const isAddonOfSelectedMain = selectedMainCodes.has(a.productCode);
            return !(isAddonSelected || isAddonOfSelectedMain);
        });

        this.updateDataTable();
    }




    //Ckeckbox Select All
    handleSelectAll(event) {
        const isChecked = event.target.checked;
        const checkboxes = this.template.querySelectorAll('tbody input[type="checkbox"]');
        checkboxes.forEach(checkbox => checkbox.checked = isChecked);
        // event.preventDefault();
    }

    addonButtonBound = false; 

    renderedCallback() {
        if (this.addonButtonBound) return;
        this.addonButtonBound = true;

        this.template.addEventListener('click', event => {
            if (event.target.classList.contains('addon-btn')) {
                const materialCode = event.target.dataset.id;
                 const hasAddon = this.selectedProducts.some(
                p => p.code === materialCode && p.salePrice === 0
                );


            if (hasAddon) return;

                this.showPopupFreeGood(materialCode); // เปิด popup เท่านั้น
            }
        });
    }


    isShowApplyPromotion = false ;

    showApplyPromotion() {
        this.isShowApplyPromotion = true ;
        this.isShowAddProduct = false ;
        this.datatableInitialized = false;

        setTimeout(() => {
            const table = this.template.querySelector('.product-table');
            if (!this.datatableInitialized && table) {
                Promise.all([
                    loadScript(this, jquery + '/jquery.min.js'),
                    loadScript(this, datatables + '/jquery.dataTables.min.js'),
                    loadStyle(this, datatables + '/jquery.dataTables.min.css')
                ])
                .then(() => {
                    this.initializeDataTable();
                    this.datatableInitialized = true;
                    // this.updateDataTable();
                })
                .catch(error => console.error('DataTables Load Error:', error));
            } else if (this.dataTableInstance) {
                this.dataTableInstance.clear().draw();
                this.updateDataTable();
            }
        }, 50);
    }
    // ---------------------------------------------------------------------------
    // End Order Form - Product & Addon
    // ---------------------------------------------------------------------------



    // ---------------------------------------------------------------------------
    // Start: Apply Promotion
    // ---------------------------------------------------------------------------

    isShowSummary = false ;

    showSummary() {
        this.isShowQuotation = false;
        this.isShowSummary = true;
        this.isShowApplyPromotion = false;
        this.isShowAddProduct = false ;
        this.datatableInitialized = false;

        setTimeout(() => {
            const table = this.template.querySelector('.product-table');
            if ($.fn.DataTable.isDataTable(table)) {
                $(table).DataTable().destroy();
            }

            Promise.all([
                loadScript(this, jquery + '/jquery.min.js'),
                loadScript(this, datatables + '/jquery.dataTables.min.js'),
                loadStyle(this, datatables + '/jquery.dataTables.min.css')
            ])
            .then(() => {
                // alert('Summary Page');
                this.initializeDataTable();
                this.datatableInitialized = true;
                this.updateDataTable();
            })
            .catch(error => console.error('DataTables Load Error:', error));
        }, 50);
    }


    backtoProduct(){
        this.isShowAddProduct = true;
        this.isShowApplyPromotion = false ;
        this.datatableInitialized = false;
        this.isShowSummary = false ;

        setTimeout(() => {
            const table = this.template.querySelector('.product-table');
            if (!this.datatableInitialized && table) {
                Promise.all([
                    loadScript(this, jquery + '/jquery.min.js'),
                    loadScript(this, datatables + '/jquery.dataTables.min.js'),
                    loadStyle(this, datatables + '/jquery.dataTables.min.css')
                ])
                .then(() => {
                    this.initializeDataTable();
                    this.datatableInitialized = true;
                    this.updateDataTable();
                })
                .catch(error => console.error('DataTables Load Error:', error));
            } else if (this.dataTableInstance) {
                this.dataTableInstance.clear().draw();
                this.updateDataTable();
            }
        }, 50);
    }
    // ---------------------------------------------------------------------------
    // End Apply Promotion
    // ---------------------------------------------------------------------------

    
    // ---------------------------------------------------------------------------
    // Start: Summary 
    // ---------------------------------------------------------------------------

    dataTableInstanceAddProduct;
    dataTableInstanceSummary;

    handleCancel() {
        this.isShowQuotation = true;
        this.isShowAddProduct = false;
        this.isShowSummary = false;
        this.isShowApplyPromotion = false ; 

    }

    handleSaveSuccess() {
        const evt = new ShowToastEvent({
            title: 'Save Successfully',
            message: 'ข้อมูลถูกบันทึกเรียบร้อยแล้ว',
            variant: 'success',
            mode: 'sticky'
        });
        this.dispatchEvent(evt);
    }
    // ---------------------------------------------------------------------------
    // End Summary
    // ---------------------------------------------------------------------------
}