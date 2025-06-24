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
import fetchProductLicenseExclude from '@salesforce/apex/INID_OrderController.fetchProductLicenseExclude' ;
import { refreshApex } from '@salesforce/apex';



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
    @track itemNumberFormat = 0;
    quoteItemData; 
    @api recordId;
    isShowAddfromText = false;
    isLoaded = false;
    hasAlerted = false;
    @track accountId ;
    @track accountChannel ;
    @track accountChannelData ;
    @track accountLicenseData ;
    @track accountLicenseId ;
    @track accountLicense ;
    @track fetchClassifyType; 
    @track sellableClassifyIds ;
    @track licenseExcludeData = [] ;
    @track productLicenseExclude = [] ;


    columns = [
        { label: 'Material Code', fieldName: 'code', type: 'text', hideDefaultActions: true, cellAttributes: { alignment: 'right' }, initialWidth: 120 },
        { label: 'SKU Description', fieldName: 'description', type: 'text', hideDefaultActions: true, cellAttributes: { alignment: 'right' }, initialWidth: 267.5 },
        { label: 'Unit Price', fieldName: 'unitPrice', type: 'currency', typeAttributes: { minimumFractionDigits: 2 }, hideDefaultActions: true, cellAttributes: { alignment: 'right' }, initialWidth: 150 },
        { label: 'Quantity', fieldName: 'quantity', type: 'text', editable: true, hideDefaultActions: true, cellAttributes: { alignment: 'right' }, initialWidth: 100 },
        { label: 'Sale Price', fieldName: 'salePrice', type: 'currency', editable: true, typeAttributes: { minimumFractionDigits: 2 }, hideDefaultActions: true, cellAttributes: { alignment: 'right' }},
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

    @wire(fetchClassifyLicense, {accountChannel: '$accountChannel' })
    wiredFetchClassifyLicense({ error, data }) {
        if (data) {
            this.classifyLicense = JSON.parse(data);

            this.classifyLicense = this.classifyLicense.map(record => {
                const { attributes, ...clean } = record;
                return clean;
            });

            // ✅ ดึง INID_Classify__c ไม่ซ้ำ
            this.classifyLicenseId = [...new Set(
                this.classifyLicense.map(record => record.INID_Classify__c)
            )];

            console.log('📌 classify license Id:', JSON.stringify(this.classifyLicenseId , null , 2));
            console.log('✅ Clean classifyLicense:', JSON.stringify(this.classifyLicense, null, 2));

            if (this.classifyLicenseId.length > 0) {
                fetchClassifyType({ classifyId: this.classifyLicenseId })
                    .then(result => {
                        this.classifyType = result;
                        console.log('✅ classify type:', JSON.stringify(this.classifyType, null, 2));

                        this.summaryClassify = [];

                        // 🔄 Map: ClassifyId → requireLicense
                        const requireMap = {};
                        this.classifyType.forEach(item => {
                            requireMap[item.Id] = item.INID_Require_License__c;
                        });

                        // ✅ จัดกลุ่ม license ตาม classify/group
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

                        // ✅ ประมวลผลแต่ละ classify
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

                            // ✅ เก็บสรุปผล
                            this.summaryClassify.push({
                                classifyId: classify,
                                groups,
                                reason,
                                canSell,
                                requireLicense,
                                ...(matchedGroup ? { matchedGroup } : {})
                            });

                            // ✅ แสดง log
                            console.log(`👉 Classify: ${classify}`);
                            console.log(`   🔧 ต้องตรวจ license? : ${requireLicense}`);
                            console.log(`   📌 License ของ Account: ${JSON.stringify(this.accountLicense)}`);
                            console.log(`   📌 License ของ Classify: ${JSON.stringify(allLicenses)}`);

                            if (groupNumbers.length === 1) {
                                const groupLicenses = groups[groupNumbers[0]].map(r => r.INID_License__c);
                                console.log(`   กลุ่มเลข: ${groupNumbers[0]} License ที่ต้องมีครบ: ${JSON.stringify(groupLicenses)}`);
                            } else {
                                console.log(`   กลุ่มทั้งหมดและ license ในแต่ละกลุ่ม:`);
                                groupNumbers.forEach(groupNo => {
                                    const groupLicenses = groups[groupNo].map(r => r.INID_License__c);
                                    console.log(`      - กลุ่ม ${groupNo}: ${JSON.stringify(groupLicenses)}`);
                                });
                            }

                            console.log(`   ขายได้หรือไม่: ${canSell ? ' ขายได้' : ' ขายไม่ได้'} (${reason})`);
                            console.log('---------------------------------------------------');
                        });

                        // สร้างตัวแปรเฉพาะ Classify ที่ขายได้
                        this.sellableClassifyIds = this.summaryClassify
                            .filter(c => c.canSell)
                            .map(c => c.classifyId);

                        console.log('Sellable Classify Ids:', JSON.stringify(this.sellableClassifyIds));
                    })
                    .catch(err => {
                        console.error(' Error fetching classify type:', err);
                    });
            }

        } else if (error) {
            console.error('Error fetching classify license:', error);
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

    // @wire(fetchAccountChannel , {accountId: '$accountId'})
    // wiredAccountChannel({ error, data }) {
    //     if (data) {
    //         this.accountChannelData = data
    //         // this.accountChannel = this.accountChannelData.map(channel => channel.INID_Channel__c);
    //         this.accountChannel = this.accountChannelData[0]?.INID_Channel__c || '';

    //         console.log('Account Channel ' + JSON.stringify(this.accountChannel , null ,2));
    //     } else if (error) {
    //         console.error('Error fetching accounts:', error);
    //     }
    // }

    // @wire(fetchAccountLicense , {accountId: '$accountId'})
    // wiredFetchAccountLicense({error , data}) {
    //     if(data) {
    //         this.accountLicenseData = data ;
    //         this.accountLicenseId = this.accountLicenseData.map(accLicenseId => accLicenseId.Id) ;
    //         this.accountLicense = this.accountLicenseData.map(acc => acc.INID_License__c);
    //         console.log('account License : ' + JSON.stringify(this.accountLicense , null ,2)) ;
    //     } else {
    //         console.log(error) ;
    //     }
    // }

    
    // @wire(fetchClassifyProduct , {sellableClassifyIds: '$sellableClassifyIds'})
    // wiredFetchClassifyProduct({error , data}) {
    //     if(data) {
    //         this.productPriceBook = data;
    //         console.log('product price book ' + JSON.stringify(this.productPriceBook , null , 2));
    //     } else if(error) {
    //         console.error(error) ;
    //     }
    // }

    // @wire(fetchProductLicenseExclude , {accountLicenseId: '$accountLicenseId'})
    // wiredFetchProductLicenseExclude({error , data}) {
    //     try {
    //         if(data) {
    //             this.licenseExcludeData = data ;
    //             this.productLicenseExclude = this.licenseExcludeData.map(prodId => prodId.INID_Product_Price_Book__c);
                
    //             console.log('license Exclude data : ' + JSON.stringify(this.licenseExcludeData,null, 2)); 
    //             console.log('Product Exclude' + JSON.stringify(this.productLicenseExclude, null, 2))
    //         } else if(error) {
    //             console.log('message error from fetch product license exclude is : ' + JSON.stringify(error , null ,2)) ;
    //         }
    //     } catch (e) {
    //         console.error('🔥 Caught error:', JSON.stringify(e , null ,2));
    //     }
    // }

    @wire(fetchAccountChannel, { accountId: '$accountId' })
    wiredAccountChannel({ error, data }) {
        console.log('📌 fetchAccountChannel called');
        if (data) {
            console.log('✅ fetchAccountChannel data:', JSON.stringify(data, null, 2));
            this.accountChannelData = data;
            this.accountChannel = this.accountChannelData[0]?.INID_Channel__c || '';
            console.log('👉 accountChannel:', this.accountChannel);
        } else if (error) {
            console.error('❌ fetchAccountChannel error:', JSON.stringify(error, null, 2));
        }
    }

    @wire(fetchAccountLicense, { accountId: '$accountId' })
    wiredFetchAccountLicense({ error, data }) {
        console.log('📌 fetchAccountLicense called');
        if (data) {
            console.log('✅ fetchAccountLicense data:', JSON.stringify(data, null, 2));
            this.accountLicenseData = data;
            this.accountLicenseId = this.accountLicenseData.map(accLicenseId => accLicenseId.Id);
            this.accountLicense = this.accountLicenseData.map(acc => acc.INID_License__c);
            console.log('👉 accountLicenseId:', JSON.stringify(this.accountLicenseId, null, 2));
            console.log('👉 accountLicense:', JSON.stringify(this.accountLicense, null, 2));
        } else if (error) {
            console.error('❌ fetchAccountLicense error:', JSON.stringify(error, null, 2));
        }
    }

    @wire(fetchClassifyProduct, { sellableClassifyIds: '$sellableClassifyIds' })
    wiredFetchClassifyProduct({ error, data }) {
        console.log('📌 fetchClassifyProduct called');
        if (data) {
            console.log('✅ fetchClassifyProduct data:', JSON.stringify(data, null, 2));
            this.productPriceBook = data;
        } else if (error) {
            console.error('❌ fetchClassifyProduct error:', JSON.stringify(error, null, 2));
        }
    }

    @wire(fetchProductLicenseExclude, { accountLicenseId: '$accountLicenseId' })
    wiredFetchProductLicenseExclude({ error, data }) {
        console.log('📌 fetchProductLicenseExclude called');
        try {
            if (data) {
                console.log('✅ fetchProductLicenseExclude data:', JSON.stringify(data, null, 2));
                this.licenseExcludeData = data;
                this.productLicenseExclude = this.licenseExcludeData.map(prodId => prodId.INID_Product_Price_Book__c);
                console.log('👉 productLicenseExclude:', JSON.stringify(this.productLicenseExclude, null, 2));
            } else if (error) {
                console.error('❌ fetchProductLicenseExclude error:', JSON.stringify(error, null, 2));
            }
        } catch (e) {
            console.error('🔥 Caught error in fetchProductLicenseExclude:', JSON.stringify(e, null, 2));
        }
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
    getDataByQuoteId(result) {
        this.quoteItemData = result; // เก็บไว้ใช้ refreshApex
        const {error, data} = result;
        if(data) {
            this.quoteOrderItemValue = data ;
            this.selectedProducts = this.quoteOrderItemValue.map((productItem) => {
                return{
                    rowKey: productItem.Id,
                    recordId: productItem.Id,
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
    // handleInputProduct(event) {
    //     this.searchProductTerm = event.target.value;
    //     const term = this.searchProductTerm.toLowerCase().trim();
    //     this.showProductDropdown = term.length > 2;
    //     this.filteredProductOptions = this.productPriceBook.filter(product => {
    //         const productId = p.INID_Product_Price_Book__r.Id;
    //         const description = (product.INID_Product_Price_Book__r.INID_SKU_Description__c || '').toLowerCase();
    //         const materialCode = (product.INID_Product_Price_Book__r.INID_Material_Code__c || '').toLowerCase();
    //         const isExcluded = this.productLicenseExclude.includes(productId);
    //         return description.includes(term) || materialCode.includes(term);
    //     });
    // }

    handleInputProduct(event) {
        this.searchProductTerm = event.target.value;
        const term = this.searchProductTerm.toLowerCase().trim();
        this.showProductDropdown = term.length > 2;

        this.filteredProductOptions = this.productPriceBook.filter(product => {
            const productId = product.INID_Product_Price_Book__r.Id;
            const description = (product.INID_Product_Price_Book__r.INID_SKU_Description__c || '').toLowerCase();
            const materialCode = (product.INID_Product_Price_Book__r.INID_Material_Code__c || '').toLowerCase();
            const isExcluded = this.productLicenseExclude.includes(productId);

            return !isExcluded && (description.includes(term) || materialCode.includes(term));
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
        return {
            rowKey: source.INID_Product_Price_Book__r.Id,
            id: source.INID_Product_Price_Book__r.Id,
            code: source.INID_Product_Price_Book__r.INID_Material_Code__c,
            description: source.INID_Product_Price_Book__r.INID_SKU_Description__c,
            unitPrice,
            quantity,
            salePrice: unitPrice,
            unit: source.INID_Product_Price_Book__r.INID_Unit__c || '',
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
        const excluded = [];

        this.enteredProductCodes.forEach(code => {
            const match = this.productPriceBook.find(p => 
                p.INID_Product_Price_Book__r.INID_Material_Code__c === code
            );
            if (!match) {
                invalid.push(code);
            } else {
                const productId = match.INID_Product_Price_Book__r.Id;
                const isExcluded = this.productLicenseExclude.includes(productId);
                const alreadyExists = this.selectedProducts.some(p => p.code === code);

                if (isExcluded) {
                    excluded.push(code);
                } else if (alreadyExists) {
                    duplicates.push(code);
                } else {
                    const unitPrice = match.INID_Product_Price_Book__r.INID_Unit_Price__c || 0;
                    const quantity = 1;
                    added.push({
                        rowKey: productId,
                        id: productId,
                        code: match.INID_Product_Price_Book__r.INID_Material_Code__c,
                        Name: match.INID_Product_Price_Book__r.Name,
                        description: match.INID_Product_Price_Book__r.INID_SKU_Description__c,
                        quantity,
                        salePrice: unitPrice,
                        unit: match.INID_Product_Price_Book__r.INID_Unit__c,
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
