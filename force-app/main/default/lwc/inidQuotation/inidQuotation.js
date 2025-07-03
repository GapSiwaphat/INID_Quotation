import { LightningElement, track, wire , api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CloseActionScreenEvent } from 'lightning/actions';
import LightningConfirm from 'lightning/confirm';
import fetchDataProductPriceBook from '@salesforce/apex/INID_OrderTest.fetchDataProductPriceBook'
import insertQuoteItem from '@salesforce/apex/inidQuotation.insertQuoteItem';
import getRecordId from '@salesforce/apex/inidQuotation.getRecordId'
import fetchQuoteItemById from '@salesforce/apex/inidQuotation.fetchQuoteItemById'
import deleteQuoteItems from '@salesforce/apex/inidQuotation.deleteQuoteItems'
import fetchAccountIdByQuote from '@salesforce/apex/INID_OrderController.fetchAccountIdByQuote' ;
import fetchAccountChannel from '@salesforce/apex/INID_OrderController.fetchAccountChannel';
import fetchAccountLicense from '@salesforce/apex/INID_OrderController.fetchAccountLicense';
import fetchClassifyLicense from '@salesforce/apex/INID_OrderController.fetchClassifyLicense' ;
import fetchClassifyProduct from '@salesforce/apex/INID_OrderController.fetchClassifyProduct' ;
import fetchClassifyType from '@salesforce/apex/INID_OrderController.fetchClassifyType' ;
import fetchUserGroup from '@salesforce/apex/INID_OrderController.fetchUserGroup' ;
import fetchBuGroupId from '@salesforce/apex/INID_OrderController.fetchBuGroupId' ;
import fetchProductsByBuGroups from '@salesforce/apex/INID_OrderController.fetchProductsByBuGroups' ;
import fetchProductLicenseExclude from '@salesforce/apex/INID_OrderController.fetchProductLicenseExclude' ;
import fetchAverage from '@salesforce/apex/INID_OrderController.fetchAverage' ;
import { refreshApex } from '@salesforce/apex';
import USER_ID from '@salesforce/user/Id';


export default class InidAddProduct extends LightningElement {
    @api recordId;

    @track searchProductTerm = '';
    @track textareaValue = '';
    @track filteredProductOptions = [];
    @track productPriceBook = [];
    @track draftValues = [];
    @track selectedRowIds = [];
    @track selectedProducts = [];
    @track showProductDropdown = false;
    @track quoteOrderItemValue = [];
    @track itemNumberFormat = 0;
    quoteItemData; 

    isShowAddfromText = false;
    isLoaded = false;
    hasAlerted = false;
    @track accountId ;
    @track accountChannel ;
    @track accountChannelData = [] ;
    @track accountLicenseData = [] ;
    @track accountLicenseId = [] ;
    @track accountLicense = [] ;
    @track classifyType = []; 
    @track sellableClassifyIds = [] ;
    @track licenseExcludeData = [] ;
    @track productLicenseExclude = [] ;
    @track enteredProductCodes = [] ;
    @track userId = USER_ID;
    @track userGroup ;
    @track buGroupData = [];
    @track buGroupId;
    @track productsByBuGroups = [] ;
    @track productBuGroupId = [] ;
    @track productBuIds;
    @track quoteId ;
    @track classifyLicenseId ;
    @track allBU ;
    @track productAverage ;
    

    columns = [
        { label: 'Material Code', fieldName: 'code', type: 'text', hideDefaultActions: true, cellAttributes: { alignment: 'right' }, initialWidth: 120 },
        { label: 'SKU Description', fieldName: 'description', type: 'text', hideDefaultActions: true, cellAttributes: { alignment: 'right' }, initialWidth: 267.5 },
        { label: 'Unit Price', fieldName: 'unitPrice', type: 'currency', typeAttributes: { minimumFractionDigits: 2 }, hideDefaultActions: true, cellAttributes: { alignment: 'right' }, initialWidth: 150 },
        { label: 'Quantity', fieldName: 'quantity', type: 'text', editable: true, hideDefaultActions: true, cellAttributes: { alignment: 'right' }, initialWidth: 100 },
        {
            label: 'Sale Price',
            fieldName: 'salePrice',
            type: 'currency',
            editable: { fieldName: 'editableSalePrice' },
            typeAttributes: { minimumFractionDigits: 2 },
            hideDefaultActions: true,
            cellAttributes: { alignment: 'right' }
        },
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
        if (this.quoteItemData) {
            refreshApex(this.quoteItemData); 
        }

    }

    @wire(fetchUserGroup, {userId: '$userId'})
    wiredUserGroup({ error, data }) {
        if (data) {
            this.userGroup = data;
            console.log('user Gruop : ' + JSON.stringify(this.userGroup, null, 2) );
        } else if (error) {
            console.error('Error fetching usergroup:', error);
        }
    }

    @wire(fetchBuGroupId, {userGroup: '$userGroup'})
    wiredBuGroupId({ error, data }) {
        if (data) {
            this.buGroupData = data;
            this.buGroupId = this.buGroupData.map(r => r.INID_BU_Group__c);
            const allBUValues = this.buGroupData.map(r => r.INID_All_BU__c);
            this.allBU = allBUValues.includes(true) || allBUValues.includes("true");

            console.log('BU Group Ids : ' + JSON.stringify(this.buGroupId, null, 2));
            console.log('All BU : ' + this.allBU);
            this.updateEditableSalePrice();

        } else if (error) {
            console.error('Error fetching buGroupId:', error);
        }
    }

    @wire(fetchProductsByBuGroups, {buGroupIds: '$buGroupId'})
    wiredproductsByBuGroups({ error, data }) {
        if (data) {
            this.productsByBuGroups = data;
            this.productBuGroupId = this.productsByBuGroups.map(r => r.INID_Product_Price_Book__c);
            this.productBuIds = new Set(this.productBuGroupId);
            console.log('Product Price Book by BU Group : ' + JSON.stringify(this.productBuGroupId, null, 2));
            this.updateEditableSalePrice();

        } else if (error) {
            console.error('Error fetching productsByBuGroups:', error);
        }
    }
    
    // Apex wire: get record id
    @wire(getRecordId, { quoteId: '$recordId' })
    wireGetRecordId({ error, data }) {
        if (data) {
            this.quoteId = data;
            console.log('quoteId : ' + data);
        } else {
            console.log(error);
        }
    }

    @wire(fetchAccountIdByQuote , {quoteId: '$recordId'}) 
    wireFetchAccountIdByQuote({ error, data }) {
        if (data) {
            this.accountId = data;
            console.log('accountId: ' + this.accountId);
        } else if (error) {
            console.log('error ' + JSON.stringify(error, null ,2));
        }
    }

    @wire(fetchAccountChannel, { accountId: '$accountId' })
    wiredAccountChannel({ error, data }) {
        console.log(' fetchAccountChannel called');
        if (data) {
            console.log(' fetchAccountChannel data:', JSON.stringify(data, null, 2));
            this.accountChannelData = data;
            this.accountChannel = this.accountChannelData[0]?.INID_Channel__c || '';
            console.log(' accountChannel:', this.accountChannel);
            console.log(' Type of accountChannel:', typeof(this.accountChannel));
        } else if (error) {
            console.error(' fetchAccountChannel error:', JSON.stringify(error, null, 2));
        }
    }

    @wire(fetchClassifyLicense, { accountChannel: '$accountChannel' })
    wiredFetchClassifyLicense({ error, data }) {
        if (data) {
            try {
                const parsed = typeof data === 'string' ? JSON.parse(data) : data;
                this.classifyLicense = parsed.map(record => {
                    const { attributes, ...clean } = record;
                    return clean;
                });

                this.classifyLicenseId = [...new Set(
                    this.classifyLicense.map(record => record.INID_Classify__c)
                )];

                console.log('Clean classifyLicense:', JSON.stringify(this.classifyLicense, null, 2));
                console.log(' classify license Id:', JSON.stringify(this.classifyLicenseId, null, 2));
            } catch (e) {
                console.error(' Error processing classify license data:', e.message, e);
            }
        } else if (error) {
            console.error(' Error fetching classify license:', error.body ? error.body.message : error.message, error);
        }
    }


    // เมื่อ classifyLicenseId พร้อมแล้วให้ wire fetchClassifyType
    @wire(fetchClassifyType, { classifyId: '$classifyLicenseId' })
    wiredFetchClassifyType({ error, data }) {
        if (data) {
            this.classifyType = data;
            console.log('classify type:', JSON.stringify(this.classifyType, null, 2));

            this.processSummaryClassify();

        } else if (error) {
            console.error('Error fetching classify type:', error);
        }
    }

    @wire(fetchAverage, {accountId: '$accountId'})
    wiredAverge({ error, data }) {
        if (data) {
            this.productAverage = data;
            console.log('productAverage: ' + JSON.stringify(this.productAverage, null, 2) );
        } else if (error) {
            console.error('Error fetching accounts:', error);
        }
    }

    updateEditableSalePrice() {
        if (!this.selectedProducts || this.selectedProducts.length === 0) return;

        this.selectedProducts = this.selectedProducts.map(p => {
            const productPriceBookId = p.id;
            let editableSalePrice = false;

            if (this.allBU === true || this.allBU === "true") {
                editableSalePrice = true;
            } else if (this.productBuIds && this.productBuIds.has(productPriceBookId)) {
                editableSalePrice = true;
            }

            return { ...p, editableSalePrice };
        });
        console.log('Updated selectedProducts with editableSalePrice:', JSON.stringify(this.selectedProducts, null, 2));
    }


    processSummaryClassify() {
        this.summaryClassify = [];

        const requireMap = {};
        this.classifyType.forEach(item => {
            requireMap[item.Id] = item.INID_Require_License__c;
        });

        const grouped = {};
        this.classifyLicense.forEach(record => {
            const classify = record.INID_Classify__c;
            const group = record.INID_License_Group__c;

            if (!grouped[classify]) {
                grouped[classify] = {};
            }
            if (!grouped[classify][group]) {
                grouped[classify][group] = [];
            }
            grouped[classify][group].push(record);
        });

        Object.keys(grouped).forEach(classify => {
            const requireLicense = requireMap[classify] === true;
            let canSell = false;
            let reason = '';
            let matchedGroup = null;

            const groups = grouped[classify];
            const groupNumbers = Object.keys(groups);

            const allLicenses = [];
            Object.values(groups).forEach(records => {
                records.forEach(r => {
                    if (!allLicenses.includes(r.INID_License__c)) {
                        allLicenses.push(r.INID_License__c);
                    }
                });
            });

            if (!requireLicense) {
                canSell = true;
                reason = 'ไม่ต้องใช้ license สามารถขายได้เลย';
            } else {
                if (groupNumbers.length === 1) {
                    const groupLicenses = groups[groupNumbers[0]].map(r => r.INID_License__c);
                    const hasAll = groupLicenses.every(lic => this.accountLicense.includes(lic));
                    canSell = hasAll;
                    reason = hasAll
                        ? 'ลูกค้ามี license ครบตามที่กลุ่มนี้กำหนด'
                        : 'ลูกค้าขาด license ที่จำเป็นในกลุ่มนี้';
                } else {
                    for (let groupNo of groupNumbers) {
                        const groupLicenses = groups[groupNo].map(r => r.INID_License__c);
                        const hasAll = groupLicenses.every(lic => this.accountLicense.includes(lic));
                        if (hasAll) {
                            canSell = true;
                            matchedGroup = groupNo;
                            reason = `ลูกค้ามี license ครบในกลุ่ม ${matchedGroup}`;
                            break;
                        }
                    }
                    if (!canSell) {
                        reason = 'ลูกค้าไม่มี license ครบในกลุ่มใดกลุ่มหนึ่ง';
                    }
                }
            }

            this.summaryClassify.push({
                classifyId: classify,
                groups,
                reason,
                canSell,
                requireLicense,
                ...(matchedGroup ? { matchedGroup } : {})
            });

            console.log(` Classify: ${classify}`);
            console.log(`   ขายได้หรือไม่: ${canSell ? ' ขายได้' : ' ขายไม่ได้'} (${reason})`);
            console.log('---------------------------------------------------');
        });

        this.sellableClassifyIds = this.summaryClassify
            .filter(c => c.canSell)
            .map(c => c.classifyId);

        console.log('Sellable Classify Ids:', JSON.stringify(this.sellableClassifyIds));
    }

    @wire(fetchAccountLicense, { accountId: '$accountId' })
    wiredFetchAccountLicense({ error, data }) {
        console.log('fetchAccountLicense called');
        if (data) {
            console.log('fetchAccountLicense data:', JSON.stringify(data, null, 2));
            this.accountLicenseData = data;
            this.accountLicenseId = this.accountLicenseData.map(accLicenseId => accLicenseId.Id);
            this.accountLicense = this.accountLicenseData.map(acc => acc.INID_License__c);
            console.log(' accountLicenseId:', JSON.stringify(this.accountLicenseId, null, 2));
            console.log(' accountLicense:', JSON.stringify(this.accountLicense, null, 2));
        } else if (error) {
            console.error('fetchAccountLicense error:', JSON.stringify(error, null, 2));
        }
    }

    @wire(fetchClassifyProduct, { sellableClassifyIds: '$sellableClassifyIds' })
    wiredFetchClassifyProduct({ error, data }) {
        console.log('fetchClassifyProduct called');
        if (data) {
           
            this.productPriceBook = data;
            console.log('fetchClassifyProduct data:', JSON.stringify(this.productPriceBook, null, 2));
        } else if (error) {
            console.error('fetchClassifyProduct error:', JSON.stringify(error, null, 2));
        }
    }

    @wire(fetchProductLicenseExclude, { accountLicenseId: '$accountLicenseId' })
    wiredFetchProductLicenseExclude({ error, data }) {
        console.log('fetchProductLicenseExclude called');
        try {
            if (data) {
                console.log('fetchProductLicenseExclude data:', JSON.stringify(data, null, 2));
                this.licenseExcludeData = data;
                this.productLicenseExclude = this.licenseExcludeData.map(prodId => prodId.INID_Product_Price_Book__c);
                console.log('productLicenseExclude:', JSON.stringify(this.productLicenseExclude, null, 2));
            } else if (error) {
                console.error('fetchProductLicenseExclude error:', JSON.stringify(error, null, 2));
            }
        } catch (e) {
            console.error('Caught error in fetchProductLicenseExclude:', JSON.stringify(e, null, 2));
        }
    }


    // get data by qoute id
    @wire(fetchQuoteItemById, {quoteId: '$recordId'})
    getDataByQuoteId(result) {
        this.quoteItemData = result; // เก็บไว้ใช้ refreshApex
        const {error, data} = result;
        if(data) {
            this.quoteOrderItemValue = data ;
            this.selectedProducts = this.quoteOrderItemValue.map((productItem) => {
                console.log('select product quote:' + JSON.stringify(this.quoteOrderItemValue , null ,2));
                const productPriceBookId = productItem.INID_Product_Price_Book__r.Id;
                console.log('product BUID : ' + JSON.stringify(this.productBuIds , null ,2));

                let editableSalePrice = false;
                if (this.allBU === "true") {
                    editableSalePrice = true;
                } else if (this.productBuIds && this.productBuIds.has(productPriceBookId)) {
                    editableSalePrice = true;
                }

                return{
                    rowKey: productItem.Id,
                    recordId: productItem.Id,
                    id: productItem.INID_Product_Price_Book__r.Id,
                    code: productItem.INID_Product_Price_Book__r.INID_Material_Code__c,
                    name: productItem.INID_Product_Price_Book__r.Name,
                    description: productItem.INID_SKU_Description__c ,
                    unitPrice: productItem.INID_Product_Price_Book__r.INID_Unit_Price__c || 0,
                    quantity: productItem.INID_Quantity__c ,
                    salePrice: productItem.INID_Sale_Price__c ,
                    unit: productItem.INID_Product_Price_Book__r.INID_Unit__c ,
                    total: productItem.INID_Quantity__c * productItem.INID_Sale_Price__c ,
                    editableSalePrice
                }
            })
        }else {
            console.log(error);
        }
    }


    handleInputProduct(event) {
        this.searchProductTerm = event.target.value;
        const term = this.searchProductTerm.toLowerCase().trim();
        this.showProductDropdown = term.length > 2;

        this.filteredProductOptions = this.productPriceBook.filter(product => {
            const productId = product.INID_Product_Price_Book__r.Id;
            const description = (product.INID_Product_Price_Book__r.INID_SKU_Description__c || '').toLowerCase();
            const code = (product.INID_Product_Price_Book__r.INID_Material_Code__c || '').toLowerCase();
            const name = (product.INID_Product_Price_Book__r.Name || '').toLowerCase();
            const isExcluded = this.productLicenseExclude.includes(productId);

            return !isExcluded && (description.includes(term) || code.includes(term));
        });
    }


    // Select product to table
    handleSelectProduct(event) {
        const selectedId = event.currentTarget.dataset.id;
        const selectedProduct = this.productPriceBook.find(p => p.INID_Product_Price_Book__r.Id === selectedId);

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
        const unitPrice = source.INID_Product_Price_Book__r.INID_Unit_Price__c || 0;
        const quantity = 1;
        const productPriceBookId = source.INID_Product_Price_Book__r.Id;
        let salePrice = source.INID_Product_Price_Book__r.INID_Unit_Price__c || 0;
        const matchedAverage = this.productAverage?.find(avg => avg.INID_Product_Price_Book__c === productPriceBookId);
        if (matchedAverage) {
            salePrice = matchedAverage.INID_Price__c;
        }

        let editableSalePrice = false;

        if (this.allBU === "true") {
            editableSalePrice = true;
        } else if (this.productBuIds && this.productBuIds.has(productPriceBookId)) {
            editableSalePrice = true;
        }

        return {
            rowKey: productPriceBookId,
            id: productPriceBookId,
            code: source.INID_Product_Price_Book__r.INID_Material_Code__c,
            name: source.INID_Product_Price_Book__r.Name,
            description: source.INID_Product_Price_Book__r.INID_SKU_Description__c,
            unitPrice: salePrice,
            quantity,
            salePrice: salePrice,
            unit: source.INID_Product_Price_Book__r.INID_Unit__c || '',
            total: unitPrice * quantity,
            editableSalePrice,
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

    // ตัวเก่า
    // Add products from textarea to table
    addProductToTable() {
        if (!this.enteredProductCodes?.length) {
            this.showToast('ไม่มีข้อมูล', 'กรุณากรอกรหัสสินค้าอย่างน้อย 1 รายการ', 'error');
            return;
        }

        const added = [];
        const duplicates = [];
        const invalid = [];
        const excluded = [];

        this.enteredProductCodes.forEach(code => {
            // console.log('product price book add product to table:' + JSON.stringify(this.productPriceBook , null ,2));
            // console.log('eneter product code :' + JSON.stringify(this.enteredProductCodes , null ,2)) ;
            const match = this.productPriceBook.find(p => 
                p.INID_Product_Price_Book__r.INID_Material_Code__c === code
            );
            // console.log('match Product ? : ' + JSON.stringify(match , null , 2));
            if (!match) {
                invalid.push(code);
                console.log('!match')
            } else {
                console.log('match')
                const productId = match.INID_Product_Price_Book__r.Id;
                const isExcluded = this.productLicenseExclude.includes(productId);
                const alreadyExists = this.selectedProducts.some(p =>
                    p.code === code
                );

                const productPriceBookId = match.INID_Product_Price_Book__r.Id;

                // console.log('is excute:' + isExcluded);
                // console.log('product lisenc')

                if (isExcluded) {
                    excluded.push(code);
                } else if (alreadyExists) {
                    duplicates.push(code);
                } else {
                    const unitPrice = match.INID_Product_Price_Book__r.INID_Unit_Price__c || 0;
                    const quantity = 1;
                    let editableSalePrice = false;

                    if (this.allBU === "true") {
                        editableSalePrice = true;
                    } else if (this.productBuIds && this.productBuIds.has(productPriceBookId)) {
                        editableSalePrice = true;
                    }

                    

                    // let salePrice = unitPrice;


                    let salePrice = match.INID_Product_Price_Book__r.INID_Unit_Price__c || 0;
                    const matchedAverage = this.productAverage?.find(avg => avg.INID_Product_Price_Book__c === productPriceBookId);
                    // console.log('match average  : ' + JSON.stringify(this.productAverage));
                    if (matchedAverage) {
                        salePrice = matchedAverage.INID_Price__c;
                    }

                    added.push({
                        rowKey: productPriceBookId,
                        id: productPriceBookId,
                        code: match.INID_Product_Price_Book__r.INID_Material_Code__c,
                        name: match.INID_Product_Price_Book__r.Name,
                        description: match.INID_Product_Price_Book__r.INID_SKU_Description__c,
                        quantity,
                        unitPrice: salePrice ,
                        salePrice,
                        unit: match.INID_Product_Price_Book__r.INID_Unit__c,
                        total: salePrice * quantity,
                        editableSalePrice
                    });
                }
            }
        });

        if (added.length) {
            this.selectedProducts = [...this.selectedProducts, ...added];
            this.isShowAddfromText = false;
        }
        if (duplicates.length) {
            this.showToast('รายการซ้ำ', `สินค้านี้มีอยู่ในตารางแล้ว: ${duplicates.join(', ')}`, 'warning');
        }
        if (excluded.length) {
            this.showToast('สินค้าถูกยกเว้น', `ไม่สามารถเพิ่มสินค้า: ${excluded.join(', ')}`, 'error');
        }
        if (invalid.length) {
            this.showToast('ไม่พบ Product Code', `กรุณาตรวจสอบ: ${invalid.join(', ')}`, 'error');
        }

        this.textareaValue = '';
        this.enteredProductCodes = [];
        const textarea = this.template.querySelector('lightning-textarea');
        if (textarea) textarea.value = '';
    }

    // ใช้ได้
    // addProductToTable() {
    //     console.log('🟡 Start addProductToTable()');
        
    //     if (!this.enteredProductCodes?.length) {
    //         this.showToast('ไม่มีข้อมูล', 'กรุณากรอกรหัสสินค้าอย่างน้อย 1 รายการ', 'error');
    //         console.warn('⛔ enteredProductCodes is empty or undefined');
    //         return;
    //     }

    //     const added = [];
    //     const duplicates = [];
    //     const invalid = [];
    //     const excluded = [];

    //     console.log('🔹 enteredProductCodes:', this.enteredProductCodes);
    //     console.log('🔹 productPriceBook:', this.productPriceBook);

    //     this.enteredProductCodes.forEach(code => {
    //         console.log(`➡️ Checking code: "${code}"`);

    //         const match = this.productPriceBook.find(p => 
    //             p.INID_Product_Price_Book__r.INID_Material_Code__c === code
    //         );
    //         console.log('🔍 Match result:', match);

    //         if (!match) {
    //             console.warn(`❌ ไม่พบสินค้าใน PriceBook สำหรับ code: ${code}`);
    //             invalid.push(code);
    //         } else {
    //             const productId = match.INID_Product_Price_Book__r.Id;
    //             console.log(`✅ พบสินค้า: ${match.INID_Product_Price_Book__r.Name}, ID: ${productId}`);

    //             const isExcluded = this.productLicenseExclude.includes(productId);
    //             console.log(`🔸 isExcluded: ${isExcluded}`);

    //             const alreadyExists = this.selectedProducts.some(p => p.code === code);
    //             console.log(`🔸 alreadyExists in selectedProducts: ${alreadyExists}`);

    //             if (isExcluded) {
    //                 console.warn(`⚠️ สินค้า ${code} ถูกยกเว้น`);
    //                 excluded.push(code);
    //             } else if (alreadyExists) {
    //                 console.warn(`⚠️ สินค้า ${code} มีอยู่แล้ว`);
    //                 duplicates.push(code);
    //             } else {
    //                 let unitPrice = match.INID_Product_Price_Book__r.INID_Unit_Price__c || 0;
    //                 const productPriceBookId = productId;
    //                 const quantity = 1;

    //                 // ตรวจสอบราคาเฉลี่ย
    //                 const matchedAverage = this.productAverage?.find(avg => avg.INID_Product_Price_Book__c === productPriceBookId);
    //                 if (matchedAverage) {
    //                     console.log(`💰 พบ average price: ${matchedAverage.INID_Price__c} สำหรับ productId: ${productPriceBookId}`);
    //                     unitPrice = matchedAverage.INID_Price__c;
    //                 } else {
    //                     console.log(`ℹ️ ไม่พบ average price ใช้ unitPrice เดิม: ${unitPrice}`);
    //                 }

    //                 // ตรวจสอบสิทธิ์แก้ไขราคา
    //                 let editableSalePrice = false;
    //                 if (this.allBU === "true") {
    //                     editableSalePrice = true;
    //                     console.log(`✅ allBU === "true" → editableSalePrice: true`);
    //                 } else if (this.productBuIds && this.productBuIds.has(productPriceBookId)) {
    //                     editableSalePrice = true;
    //                     console.log(`✅ productBuIds contains productPriceBookId → editableSalePrice: true`);
    //                 } else {
    //                     console.log(`🔒 ไม่สามารถแก้ไขราคาได้`);
    //                 }

    //                 const item = {
    //                     rowKey: productPriceBookId,
    //                     id: productPriceBookId,
    //                     code: match.INID_Product_Price_Book__r.INID_Material_Code__c,
    //                     name: match.INID_Product_Price_Book__r.Name,
    //                     description: match.INID_Product_Price_Book__r.INID_SKU_Description__c,
    //                     quantity,
    //                     unitPrice,
    //                     salePrice: unitPrice,
    //                     unit: match.INID_Product_Price_Book__r.INID_Unit__c,
    //                     total: unitPrice * quantity,
    //                     editableSalePrice
    //                 };

    //                 console.log('🟢 เพิ่มสินค้า:', item);
    //                 added.push(item);
    //             }
    //         }
    //     });

    //     // Summary logging
    //     console.log('✅ added:', added);
    //     console.log('⚠️ duplicates:', duplicates);
    //     console.log('⛔ excluded:', excluded);
    //     console.log('❌ invalid:', invalid);

    //     // Update UI
    //     if (added.length) {
    //         this.selectedProducts = [...this.selectedProducts, ...added];
    //         this.isShowAddfromText = false;
    //     }
    //     if (duplicates.length) {
    //         this.showToast('รายการซ้ำ', `สินค้านี้มีอยู่ในตารางแล้ว: ${duplicates.join(', ')}`, 'warning');
    //     }
    //     if (excluded.length) {
    //         this.showToast('สินค้าถูกยกเว้น', `ไม่สามารถเพิ่มสินค้า: ${excluded.join(', ')}`, 'error');
    //     }
    //     if (invalid.length) {
    //         this.showToast('ไม่พบ Product Code', `กรุณาตรวจสอบ: ${invalid.join(', ')}`, 'error');
    //     }

    //     this.textareaValue = '';
    //     this.enteredProductCodes = [];
    //     const textarea = this.template.querySelector('lightning-textarea');
    //     if (textarea) textarea.value = '';

    //     console.log('🟢 End addProductToTable()\n');
    // }



    get hasSelectedProducts() {
        return this.selectedProducts && this.selectedProducts.length > 0;
    }   

    // Save edited rows
    handleSaveEditedRows(event) {
        const updatedValues = event.detail.draftValues;
        this.selectedProducts = this.selectedProducts.map(product => {
            const updated = updatedValues.find(d => d.rowKey === product.rowKey);
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
        this.selectedRowIds = selectedRows.map(row => row.rowKey);
        // alert('row Id:' + this.selectedRowIds);
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
        const toBeDeleted = this.selectedProducts.filter(p => selectedSet.has(p.rowKey));
        this.selectedProducts = [...this.selectedProducts];

        const confirmed = await LightningConfirm.open({
            message: `คุณแน่ใจหรือไม่ว่าต้องการลบทั้งหมด ${toBeDeleted.length} รายการ`,
            variant: 'header',
            label: 'ยืนยันการลบ',
            theme: 'warning'
        });

        if (!confirmed) return;

        const idsToDeleteInDB = toBeDeleted .filter(p => p.recordId).map(p => p.recordId);

        try {
            if (idsToDeleteInDB.length > 0) {
                await deleteQuoteItems({ quoteItemIds: idsToDeleteInDB });
            }

            this.selectedProducts = this.selectedProducts.filter(p => !selectedSet.has(p.rowKey));
            this.selectedProducts = [...this.selectedProducts]; // force UI update
            this.selectedRowIds = [];
                
            await refreshApex(this.quoteItemData);
            this.showToast('ลบข้อมูลแล้ว', 'ลบรายการจากระบบสำเร็จ', 'success');

        } catch (error) {
            this.handleSaveError(error);
        }
    }
    

    async handleSaveSuccess() {
        this.showToast('รายการแจ้งเตือน', 'ข้อมูลถูกบันทึกเรียบร้อยแล้ว', 'success');
        
        // Reload หน้า หลังจาก delay 2 วินาที
        setTimeout(() => {
            window.location.reload();
        }, 500);
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

        let itemNumber = 0 ;
        const recordsToInsert = this.selectedProducts.map((prod) => {
            itemNumber += 1 ;
            const formattedNumber = (itemNumber * 10).toString().padStart(6, '0');

            return {
                Id: prod.recordId,
                INID_Quantity__c: parseFloat(prod.quantity),
                INID_Sale_Price__c: parseFloat(prod.salePrice),
                INID_Quote__c: this.recordId,
                INID_Product_Price_Book__c: prod.id,
                INID_Item_Number__c: formattedNumber,
            };
        });

        try {
            await insertQuoteItem({ products: recordsToInsert });
            this.selectedProducts = [];
            await refreshApex(this.quoteItemData);
            this.handleSaveSuccess()
            this.showToast('สำเร็จ', 'บันทึกรายการสำเร็จ', 'success');

            setTimeout(() => {
                this.dispatchEvent(new CloseActionScreenEvent());
            }, 1000);

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
