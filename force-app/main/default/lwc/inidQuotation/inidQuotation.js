import { LightningElement, track, wire , api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CloseActionScreenEvent } from 'lightning/actions';
import LightningConfirm from 'lightning/confirm';
import fetchDataProductPriceBook from '@salesforce/apex/INID_OrderTest.fetchDataProductPriceBook'
import insertProductPriceBook from '@salesforce/apex/inidQuotation.insertProductPriceBook';

export default class InidAddProduct extends LightningElement {


    @track searchProductTerm = '';    
    @track textareaValue = '';

    @track filteredProductOptions = [];     
    @track productPriceBook = [] ;
    @track draftValues = [];
    @track selectedRowIds = [];
    @track selectedProducts = [];    

    @track showProductDropdown = false;
    isShowAddfromText = false ;

    @api recordId;
    
    //Get wiredproductPriceBook
    @wire(fetchDataProductPriceBook)
    wiredproductPriceBook({ error, data }) {
        if (data) {
            this.productPriceBook = data;
        } else if (error) {
            console.error('Error fetching accounts:', error);
        }
    }

    isLoaded = false;
    renderedCallback() {
        if(this.isLoaded) return;
        const STYLE = document.createElement("style");
        STYLE.innerText = `.uiModal .modal-container {
            width: 80vw !important;
            max-width: 95vw;
            min-width: 60vw;
            max-height: 100vh;
            min-height: 55.56vh;
        }`;
        this.template.querySelector('lightning-card').appendChild(STYLE);
        this.isLoaded=true;
    }


   columns = [
        { label: 'Material Code', fieldName: 'code', type: 'text', hideDefaultActions: true ,  cellAttributes: { alignment: 'right' }, initialWidth: 120},
        { label: 'SKU Description', fieldName: 'description', type: 'text', hideDefaultActions: true , cellAttributes: { alignment: 'right' } , initialWidth: 267.50}, 
        { label: 'Unit Price', fieldName: 'unitPrice', type: 'currency' , typeAttributes: {minimumFractionDigits: 2}, hideDefaultActions: true, cellAttributes: { alignment: 'right', } , initialWidth: 150},
        { label: 'Quantity', fieldName: 'quantity', type: 'text', editable: true, hideDefaultActions: true , cellAttributes: { alignment: 'right' } , initialWidth: 100 }, 
        { label: 'Sale Price', fieldName: 'salePrice', type: 'currency' , typeAttributes: {minimumFractionDigits: 2}, editable: {fieldName : 'editableSalePrice'} , hideDefaultActions: true ,  cellAttributes: { alignment: 'right'} , initialWidth: 155},
        { label: 'Unit', fieldName: 'unit', type: 'text', hideDefaultActions: true ,  cellAttributes: { alignment: 'right' } , initialWidth: 100},
        { label: 'Total', fieldName: 'total', type: 'currency' , typeAttributes: {minimumFractionDigits: 2}, hideDefaultActions: true ,  cellAttributes: { alignment: 'right' } , initialWidth: 140},
    ];

    handleInputProduct(event) {
        this.searchProductTerm = event.target.value;
        const term = this.searchProductTerm.toLowerCase().trim();

        this.showProductDropdown = term.length > 2;

        this.filteredProductOptions = this.productPriceBook.filter(p => {
            const nameStr = p.INID_SKU_Description__c ? p.INID_SKU_Description__c.toLowerCase() : '';
            const codeStr = p.INID_Material_Code__c ? p.INID_Material_Code__c.toLowerCase() : '';

            return nameStr.includes(term) || codeStr.includes(term);
        });
    }

    //Select Product To Table
    handleSelectProduct(event) {
        const selectedId = event.currentTarget.dataset.id;
        const selected = this.productPriceBook.find(p => p.Id === selectedId);

        const isDuplicate = this.selectedProducts.some(p => p.id === selectedId);
        if (!isDuplicate && selected) {
            const product = this.mapProduct(selected);
            this.selectedProducts = [...this.selectedProducts, product];
            console.log('selectedProducts:', JSON.stringify(this.selectedProducts));
        } else if (isDuplicate){
            this.dispatchEvent(
                new ShowToastEvent({
                title: 'รายการซ้ำ',
                message: 'สินค้านี้มีอยู่ในตารางแล้ว',
                variant: 'warning',

            })
        );
        }

        this.searchProductTerm = '';
        this.showProductDropdown = false;
    }
    // MapProduct To Table
    mapProduct(source, addedAddons = []) {
        const isMainProduct = source.INID_Unit_Price__c > 0;
        const hasAddon = addedAddons.includes(source.INID_Material_Code__c);
        const salePrice = source.INID_Unit_Price__c || 0;
        const quantity = 1;
        const total = salePrice * quantity;

        return {
            id: source.Id,
            code: source.INID_Material_Code__c,
            description: source.INID_SKU_Description__c,
            unitPrice: source.INID_Unit_Price__c || 0,
            quantity: 1,
            salePrice: source.INID_Unit_Price__c || 0,
            unit: source.INID_Unit__c || '',
            total: total,

            addOnButton: isMainProduct ? 'Add On' : null,
            addOnText: !isMainProduct ? 'Add-On Item' : null ,
            addOn: isMainProduct ? 'true' : 'false' ,

            nameBtn: isMainProduct ? '+' : 'Add-On Item' ,
            variant: 'brand' ,
            editableSalePrice : true  ,

            addonDisabled: isMainProduct && hasAddon,
            // editableSalePrice : true,
        };
    }

    showProductCode() {
        this.isShowAddfromText = !this.isShowAddfromText;
    }

    //Enter Product Code 1 Per Line
    enterProductOnchange(event){
        const textareaValue = event.target.value || '';
        const uniqueCodes = new Set();

        this.enteredProductCodes = textareaValue
            .split('\n')
            .map(code => code.trim())
            .filter(code => {
                if (code.length === 0) return false;
                const normalized = code.toLowerCase();
                if (uniqueCodes.has(normalized)) return false;
                uniqueCodes.add(normalized);
                return true;
            });

        console.log('Unique Product Codes entered:', this.enteredProductCodes);
    }

    //enter at least 1 product code
    addProductToTable() {
        if (!this.enteredProductCodes || this.enteredProductCodes.length === 0) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'ไม่มีข้อมูล',
                message: 'กรุณากรอกรหัสสินค้าอย่างน้อย 1 รายการ',
                variant: 'error'
            }));
            return; //หยุดทำงานทันที
        }
        const addedProducts = [];
        const duplicatedCodes = [];
        const invalidCodes = [];
        this.enteredProductCodes.forEach(code => {
            const matched = this.productPriceBook.find(p => p.INID_Material_Code__c === code);
                if (!matched) {
                    invalidCodes.push(code); // ไม่พบสินค้า
                } else {
                    const alreadyAdded = this.selectedProducts.some(p => p.code === code && p.unitPrice !== 0);
                    if (alreadyAdded) {
                        duplicatedCodes.push(code); 
                    } else {
                        const salePrice = matched.INID_Unit_Price__c || 0;
                        const quantity = 1;
                        const total = salePrice * quantity;

                    const product = {
                        id: matched.Id,
                        code: matched.INID_Material_Code__c,
                        Name: matched.Name,
                        description: matched.INID_SKU_Description__c,
                        quantity: quantity,
                        salePrice,
                        unit: matched.INID_Unit__c,
                        unitPrice: matched.INID_Unit_Price__c,
                        total: total,
                        nameBtn: '+',
                        variant: 'brand',
                        editableSalePrice : true 
                    };
                        addedProducts.push(product);
                    }
                }
         });

        if (addedProducts.length > 0) {
            this.selectedProducts = [...this.selectedProducts, ...addedProducts];
            this.isShowAddfromText = false ;

        }

        if (duplicatedCodes.length > 0) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'รายการซ้ำ',
                message: 'สินค้านี้มีอยู่ในตารางแล้ว',
                variant: 'warning',
            }));
        }

        if (invalidCodes.length > 0) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'ไม่พบ Product Code ',
                message: `กรุณาตรวจสอบ Product Code อีกครั้ง: ${invalidCodes.join(', ')}`,
                variant: 'error'
            }));
        }

        this.textareaValue = '';
        this.enteredProductCodes = [];

        const textarea = this.template.querySelector('lightning-textarea');
        if (textarea) {
            textarea.value = '';
        }
    }

    get hasSelectedProducts() {
        return this.selectedProducts && this.selectedProducts.length > 0;
    }

    //Button Save Edit Row
    handleSaveEditedRows(event) {
        const updatedValues = event.detail.draftValues;

        this.selectedProducts = this.selectedProducts.map(product => {
            const updated = updatedValues.find(d => d.id === product.id);
            if (updated) {
                const qty = Number(updated.quantity ?? product.quantity);
                const price = Number(updated.salePrice ?? product.salePrice);
                return {
                    ...product,
                    quantity: qty,
                    salePrice: price,
                    total: qty * price
                };
            }
            return product; 
        });

        this.draftValues = []; // เคลียร์ draft เพื่อซ่อนปุ่ม

        this.dispatchEvent(
            new ShowToastEvent({
                title: 'เปลี่ยนแปลงข้อมูล',
                message: 'เปลี่ยนแปลงข้อมูลสำเร็จ',
                variant: 'success'
            })
        );
    }

    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;

        // ตรวจสอบว่า row นี้เป็น Add-on หรือไม่
        const isAddon = row.unitPrice === 0;

        if (actionName === 'btnAddOn') {
            if (isAddon) {
                return;
            }

            // กรณีเป็นสินค้าหลัก → เปิด popup
            this.currentMaterialCodeForAddOn = row.code;
            this.isPopupOpenFreeGood = true;
        }
    }
    
    handleRowSelection(event) {
        const selectedRows = event.detail.selectedRows;
        let newSelectedIds = [];

        selectedRows.forEach(row => {
            const isMain = row.unitPrice !== 0;

            if (isMain) {
                // หาตัว Add-on ที่เกี่ยวข้องกับ main ตัวนี้
                const relatedAddons = this.selectedProducts.filter(
                    p => p.productCode === row.code && p.unitPrice === 0
                );

                // เก็บ id ทั้ง main + add-on
                newSelectedIds.push(row.id);
                relatedAddons.forEach(addon => {
                    newSelectedIds.push(addon.id);
                });
            } else {
                // ถ้าเป็น Add-on เลือกแค่ตัวมันเอง
                newSelectedIds.push(row.id);
            }
        });

        // กำจัด ID ซ้ำด้วย Set แล้วแปลงกลับเป็น array
        this.selectedRowIds = [...new Set(newSelectedIds)];
    }

    handleCancel() {
        this.dispatchEvent(new CloseActionScreenEvent());
    }

    async handleDeleteSelected() {
        if (!Array.isArray(this.selectedRowIds) || this.selectedRowIds.length === 0) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'ไม่มีรายการถูกเลือกเลย',
                message: 'กรุณาเลือกอย่างน้อย 1 รายการ',
                variant: 'warning'
            }));
            return;
        }

        // นับจำนวนแถวที่จะถูกลบ (รวม Add-on)
        const selectedIdsSet = new Set(this.selectedRowIds);

        const selectedMainCodes = this.selectedProducts
            .filter(p => selectedIdsSet.has(p.id) && p.unitPrice !== 0)
            .map(p => p.code);

        const toBeDeleted = this.selectedProducts.filter(product => {
            const isSelected = selectedIdsSet.has(product.id);
            const isAddonOfDeletedMain = selectedMainCodes.includes(product.productCode);
            return isSelected || isAddonOfDeletedMain;
        });

        // แสดงกล่องยืนยันก่อนลบ
        const result = await LightningConfirm.open({
            message: `คุณแน่ใจหรือไม่ว่าต้องการลบทั้งหมด ${toBeDeleted.length} รายการ`,
            variant: 'header',
            label: 'ยืนยันการลบ',
            theme: 'warning'
        });

        if (!result) {
            return; // ผู้ใช้กดยกเลิก
        }

        // ดำเนินการลบ
        const deletedAddonProductCodes = toBeDeleted
            .filter(p => p.unitPrice === 0)
            .map(p => p.productCode);

        this.selectedProducts = this.selectedProducts
            .filter(product => !toBeDeleted.includes(product))
            .map(product => {
                if (product.unitPrice !== 0 && deletedAddonProductCodes.includes(product.code)) {
                    return {
                        ...product,
                        addonDisabled: false
                    };
                }
                return product;
            });

        this.selectedRowIds = [];

        this.dispatchEvent(new ShowToastEvent({
            title: 'ลบสำเร็จ',
            message: `ลบรายการทั้งหมด ${toBeDeleted.length} รายการเรียบร้อยแล้ว`,
            variant: 'success'
        }));
    }

    handleSaveSuccess() {
        const evt = new ShowToastEvent({
            title: 'รายการแจ้งเตือน',
            message: 'ข้อมูลถูกบันทึกเรียบร้อยแล้ว',
            variant: 'success',
        });
        this.dispatchEvent(evt);
    }

    get isNextDisabled() {
        return !(this.selectedProducts && this.selectedProducts.length > 0);
    }

    handleSave() {
        // Map ค่าจาก selectedProducts ให้ตรงกับ Object field
        const recordsToInsert = this.selectedProducts.map(prod => ({
            INID_Material_Code__c: prod.code,
            INID_SKU_Description__c: prod.description,
            INID_Unit_Price__c: parseFloat(prod.unitPrice),
            INID_Quantity__c: parseFloat(prod.quantity),
            INID_Sale_Price__c: parseFloat(prod.salePrice),
            INID_Unit__c: prod.unit ,
            INID_Total__c: prod.total ,
            INID_Tatal__c: prod.total,  
            INID_Quote__c: '0Q085000000R86LCAS',
            INID_Product_Price_Book__c: prod.id,
        }));

        //  ลอง alert ดูว่าค่าออกมาถูกมั้ย

        //  เรียก Apex method ส่ง List เข้าไป
        insertProductPriceBook({ products: recordsToInsert })
            .then(() => {
                this.handleSaveSuccess(); // เขียนฟังก์ชันนี้ไว้แสดง toast สำเร็จ
            })
            .catch(error => {
                this.handleSaveError(error); // แก้ handleSaveError ดัก error ให้ดี
            });
    }


    // handleSaveError(error) {
    //     console.error('Save Error:', JSON.stringify(error));
    //     let msg = 'เกิดข้อผิดพลาดในการบันทึกข้อมูล : ' + error ;

    //     if (error && error.body && error.body.message) {
    //         msg = error.body.message;
    //     } else if (error && error.message) {
    //         msg = error.message;
    //     }

    //     this.dispatchEvent(new ShowToastEvent({
    //         title: 'Error saving data',
    //         message: msg,
    //         variant: 'error',
    //     }));
    // }

    handleSaveError(error) {
        console.error('Save Error:', JSON.stringify(error));

        let msg = 'เกิดข้อผิดพลาดในการบันทึกข้อมูล :\n\n' + JSON.stringify(error, null, 2);
        this.dispatchEvent(new ShowToastEvent({
            title: 'แจ้งเตือนข้อผิดพลาด',
            message: msg,
            variant: 'error',
        }));
    }

    get checkDataEnable() {
        return this.selectedProducts.length === 0;
        alert(msg); // แสดงเป็น alert แทน toast
    }
}