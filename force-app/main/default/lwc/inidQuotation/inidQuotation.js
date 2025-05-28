import { LightningElement, track, wire , api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CloseActionScreenEvent } from 'lightning/actions';
import LightningConfirm from 'lightning/confirm';
import fetchDataProductPriceBook from '@salesforce/apex/INID_OrderTest.fetchDataProductPriceBook'
import insertProductPriceBook from '@salesforce/apex/inidQuotation.insertProductPriceBook';
import getRecordId from '@salesforce/apex/inidQuotation.getRecordId'
import fetchQuoteItemById from '@salesforce/apex/inidQuotation.fetchQuoteItemById'

export default class InidAddProduct extends LightningElement {
    @track searchProductTerm = '';
    @track textareaValue = '';
    @track filteredProductOptions = [];
    @track productPriceBook = [];
    @track draftValues = [];
    @track selectedRowIds = [];
    @track selectedProducts = [];
    @track showProductDropdown = false;
    @track quoteOrderItemValue = [];
    @api recordId;
    isShowAddfromText = false;
    isLoaded = false;
    hasAlerted = false;

    columns = [
        { label: 'Material Code', fieldName: 'code', type: 'text', hideDefaultActions: true, cellAttributes: { alignment: 'right' }, initialWidth: 120 },
        { label: 'SKU Description', fieldName: 'description', type: 'text', hideDefaultActions: true, cellAttributes: { alignment: 'right' }, initialWidth: 267.5 },
        { label: 'Unit Price', fieldName: 'unitPrice', type: 'currency', typeAttributes: { minimumFractionDigits: 2 }, hideDefaultActions: true, cellAttributes: { alignment: 'right' }, initialWidth: 150 },
        { label: 'Quantity', fieldName: 'quantity', type: 'text', editable: true, hideDefaultActions: true, cellAttributes: { alignment: 'right' }, initialWidth: 100 },
        { label: 'Sale Price', fieldName: 'salePrice', type: 'currency', editable: true, typeAttributes: { minimumFractionDigits: 2 }, hideDefaultActions: true, cellAttributes: { alignment: 'right' }, initialWidth: 155 },
        { label: 'Unit', fieldName: 'unit', type: 'text', hideDefaultActions: true, cellAttributes: { alignment: 'right' }, initialWidth: 100 },
        { label: 'Total', fieldName: 'total', type: 'currency', typeAttributes: { minimumFractionDigits: 2 }, hideDefaultActions: true, cellAttributes: { alignment: 'right' }, initialWidth: 140 },
    ];

    renderedCallback() {
        if (this.isLoaded) return;
        const STYLE = document.createElement('style');
        STYLE.innerText = `
            .uiModal .modal-container {
                width: 80vw !important;
                max-width: 95vw;
                min-width: 60vw;
                max-height: 100vh;
                min-height: 55.56vh;
            }
        `;
        const card = this.template.querySelector('lightning-card');
        if (card) card.appendChild(STYLE);
        this.isLoaded = true;
    }

    // Apex wire: get record id
    @wire(getRecordId, { quoteId: '$recordId' })
    wireGetRecordId({ error, data }) {
        if (data) {
            console.log('quoteId : ' + data);
        } else {
            console.log(error);
        }
    }

    // Apex wire: fetch product price book
    @wire(fetchDataProductPriceBook)
    wiredproductPriceBook({ error, data }) {
        if (data) {
            this.productPriceBook = data;
        } else if (error) {
            console.error('Error fetching accounts:', error);
        }
    }

        // get data by qoute id
    @wire(fetchQuoteItemById, {quoteId: '$recordId'})
    getDataByQuoteId({error , data}) {
        if(data) {
            this.quoteOrderItemValue = data ;
            this.selectedProducts = this.quoteOrderItemValue.map((productItem) => {
                return{
                    id: productItem.INID_Product_Price_Book__r.Id,
                    code: productItem.INID_Material_Code__c ,
                    description: productItem.INID_SKU_Description__c ,
                    unitPrice: productItem.INID_Product_Price_Book__r.INID_Unit_Price__c ,
                    quantity: productItem.INID_Quantity__c ,
                    salePrice: productItem.INID_Sale_Price__c ,
                    unit: productItem.INID_Product_Price_Book__r.INID_Unit__c ,
                    total: productItem.INID_Quantity__c * productItem.INID_Sale_Price__c ,
                }
            })
        }else {
            console.log(error);
        }
    }

    // Product search input handler
    handleInputProduct(event) {
        this.searchProductTerm = event.target.value;
        const term = this.searchProductTerm.toLowerCase().trim();
        this.showProductDropdown = term.length > 2;
        this.filteredProductOptions = this.productPriceBook.filter(product => {
            const description = (product.INID_SKU_Description__c || '').toLowerCase();
            const materialCode = (product.INID_Material_Code__c || '').toLowerCase();
            return description.includes(term) || materialCode.includes(term);
        });
    }

    // Select product to table
    handleSelectProduct(event) {
        const selectedId = event.currentTarget.dataset.id;
        const selectedProduct = this.productPriceBook.find(p => p.Id === selectedId);

        if (!selectedProduct) return;
        const isAlreadySelected = this.selectedProducts.some(p => p.id === selectedId);
        if (isAlreadySelected) {
            this.showToast('รายการซ้ำ', 'สินค้านี้มีอยู่ในตารางแล้ว', 'warning');
        } else {
            const newProduct = this.mapProduct(selectedProduct);
            this.selectedProducts = [...this.selectedProducts, newProduct];
        }
        
        // Reset search state
        this.searchProductTerm = '';
        this.showProductDropdown = false;
    }

    // Map product for table row
    mapProduct(source = []) {
        const unitPrice = source.INID_Unit_Price__c || 0;
        const quantity = 1;
        return {
            id: source.Id,
            code: source.INID_Material_Code__c,
            description: source.INID_SKU_Description__c,
            unitPrice,
            quantity,
            salePrice: unitPrice,
            unit: source.INID_Unit__c || '',
            total: unitPrice * quantity,
        };
    }

    showProductCode() {
        this.isShowAddfromText = !this.isShowAddfromText;
    }

    // Handle textarea input for product codes
    enterProductOnchange(event) {
        const textareaValue = event.target.value || '';
        const uniqueCodes = new Set();
        this.enteredProductCodes = textareaValue
            .split('\n')
            .map(code => code.trim())
            .filter(code => {
                if (!code) return false;
                const normalized = code.toLowerCase();
                if (uniqueCodes.has(normalized)) return false;
                uniqueCodes.add(normalized);
                return true;
            });
    }

    // Add products from textarea to table
     addProductToTable() {
        if (!this.enteredProductCodes?.length) {
            this.showToast('ไม่มีข้อมูล', 'กรุณากรอกรหัสสินค้าอย่างน้อย 1 รายการ', 'error');
            return;
        }

        const added = [];
        const duplicates = [];
        const invalid = [];

        this.enteredProductCodes.forEach(code => {
            const match = this.productPriceBook.find(p => p.INID_Material_Code__c === code);
            if (!match) {
                invalid.push(code);
            } else {
                const alreadyExists = this.selectedProducts.some(p => p.code === code);
                if (alreadyExists) {
                    duplicates.push(code);
                } else {
                    const unitPrice = match.INID_Unit_Price__c || 0;
                    const quantity = 1;
                    added.push({
                        id: match.Id,
                        code: match.INID_Material_Code__c,
                        Name: match.Name,
                        description: match.INID_SKU_Description__c,
                        quantity,
                        salePrice: unitPrice,
                        unit: match.INID_Unit__c,
                        unitPrice,
                        total: unitPrice * quantity,
                        editableSalePrice: true
                    });
                }
            }
        });

        if (added.length) {
            this.selectedProducts = [...this.selectedProducts, ...added];
            this.isShowAddfromText = false;
        }
        if (duplicates.length) this.showToast('รายการซ้ำ', 'สินค้านี้มีอยู่ในตารางแล้ว', 'warning');
        if (invalid.length) this.showToast('ไม่พบ Product Code', `กรุณาตรวจสอบ: ${invalid.join(', ')}`, 'error');

        this.textareaValue = '';
        this.enteredProductCodes = [];
        const textarea = this.template.querySelector('lightning-textarea');
        if (textarea) textarea.value = '';
    }

    get hasSelectedProducts() {
        return this.selectedProducts && this.selectedProducts.length > 0;
    }

    // Save edited rows
    handleSaveEditedRows(event) {
        const updatedValues = event.detail.draftValues;
        this.selectedProducts = this.selectedProducts.map(product => {
            const updated = updatedValues.find(d => d.id === product.id);
            if (updated) {
                const qty = Number(updated.quantity ?? product.quantity);
                const price = Number(updated.salePrice ?? product.salePrice);
                return { ...product, quantity: qty, salePrice: price, total: qty * price };
            }
            return product;
        });
        this.draftValues = [];
        this.showToast('เปลี่ยนแปลงข้อมูล', 'เปลี่ยนแปลงข้อมูลสำเร็จ', 'success');
    }

    // Row selection handler
    handleRowSelection(event) {
        const selectedRows = event.detail.selectedRows || [];
        this.selectedRowIds = selectedRows.map(row => row.id);
    }

    handleCancel() {
        this.dispatchEvent(new CloseActionScreenEvent());
    }

    // Delete selected rows
    async handleDeleteSelected() {
        if (!Array.isArray(this.selectedRowIds) || this.selectedRowIds.length === 0) {
            this.showToast('ไม่มีรายการถูกเลือกเลย', 'กรุณาเลือกอย่างน้อย 1 รายการ', 'warning');
            return;
        }
        const selectedSet = new Set(this.selectedRowIds);
        const toBeDeleted = this.selectedProducts.filter(product => selectedSet.has(product.id));

        const confirmed = await LightningConfirm.open({
            message: `คุณแน่ใจหรือไม่ว่าต้องการลบทั้งหมด ${toBeDeleted.length} รายการ`,
            variant: 'header',
            label: 'ยืนยันการลบ',
            theme: 'warning'
        });

        if (!confirmed) return;

        this.selectedProducts = this.selectedProducts.filter(product => !selectedSet.has(product.id));
        this.selectedRowIds = [];
        this.showToast('ลบสำเร็จ', `ลบรายการทั้งหมด ${toBeDeleted.length} รายการเรียบร้อยแล้ว`, 'success');
    }
    

    handleSaveSuccess() {
        this.showToast('รายการแจ้งเตือน', 'ข้อมูลถูกบันทึกเรียบร้อยแล้ว', 'success');
    }

    get isNextDisabled() {
        return !(this.selectedProducts && this.selectedProducts.length > 0);
    }


    // Save all selected products
    async handleSave() {
        if (!this.recordId) {
            this.showToast('Error', 'ไม่พบ Quote Id', 'error');
            return;
        }
        const recordsToInsert = this.selectedProducts.map(prod => ({
            INID_Quantity__c: parseFloat(prod.quantity),
            INID_Sale_Price__c: parseFloat(prod.salePrice),
            INID_Quote__c: this.recordId,
            INID_Product_Price_Book__c: prod.id,
        }));
        try {
            await insertProductPriceBook({ products: recordsToInsert });
            this.handleSaveSuccess();
            setTimeout(() => this.dispatchEvent(new CloseActionScreenEvent()), 500);
        } catch (error) {
            this.handleSaveError(error);
        }
    }

    handleSaveError(error) {
        console.error('Save Error:', JSON.stringify(error));
        let msg = 'เกิดข้อผิดพลาดในการบันทึกข้อมูล : ' + error;
        if (error && error.body && error.body.message) {
            msg = error.body.message;
        } else if (error && error.message) {
            msg = error.message;
        }
        this.showToast('Error saving data', msg, 'error');
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    get checkDataEnable() {
        return this.selectedProducts.length === 0;
    }
}
