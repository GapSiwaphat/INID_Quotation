import { LightningElement, track, wire } from 'lwc';
import { loadScript, loadStyle } from 'lightning/platformResourceLoader';
import datatables from '@salesforce/resourceUrl/datatables';
import jquery from '@salesforce/resourceUrl/jquery';
import { CloseActionScreenEvent } from 'lightning/actions';
import fetchDataProductPriceBook from '@salesforce/apex/INID_OrderTest.fetchDataProductPriceBook';

export default class InidAddProduct extends LightningElement {
    @track productPriceBook = [];
    @track selectedProducts = [];
    @track filteredProductOptions = [];
    @track showProductDropdown = false;
    @track searchProductTerm = '';

    dataTableInstance;
    datatableInitialized = false;

    @wire(fetchDataProductPriceBook)
    wiredproductPriceBook({ error, data }) {
        if (data) {
            this.productPriceBook = data;
        } else if (error) {
            console.error('Error fetching products:', error);
        }
    }

    connectedCallback() {
        Promise.all([
            loadScript(this, jquery + '/jquery.min.js'),
            loadScript(this, datatables + '/jquery.dataTables.min.js'),
            loadStyle(this, datatables + '/jquery.dataTables.min.css')
        ]).then(() => {
            this.initializeDataTable();
            this.updateDataTable();
        });
    }

    initializeDataTable() {
        const table = this.template.querySelector('.product-table');
        if (table && !this.dataTableInstance) {
            this.dataTableInstance = $(table).DataTable({
                searching: false,
                paging: false,
                ordering: false,
                info: false,
                responsive: false
            });
        }
    }

    //Function handle Input Product
    handleInputProduct(event) {
        this.searchProductTerm = event.target.value.toLowerCase();
        this.showProductDropdown = this.searchProductTerm.length > 2;
        this.filteredProductOptions = this.productPriceBook.filter(p => {
            const nameStr = p.INID_SKU_Description__c?.toLowerCase() || '';
            const codeStr = p.INID_Material_Code__c?.toLowerCase() || '';
            return nameStr.includes(this.searchProductTerm) || codeStr.includes(this.searchProductTerm);
        });
    }

    //Function handle Select Product
    handleSelectProduct(event) {
        const id = event.currentTarget.dataset.id;
        const existing = this.selectedProducts.find(p => p.id === id);

        if (!existing) {
            const selected = this.productPriceBook.find(p => p.Id === id);
            if (selected) {
                const unitPrice = selected.INID_Unit_Price__c || 0;
                const quantity = 1;
                const salePrice = unitPrice;
                const total = salePrice * quantity;

                const newProduct = {
                    id: selected.Id,
                    code: selected.INID_Material_Code__c,
                    description: selected.INID_SKU_Description__c,
                    quantity,
                    unit: selected.INID_Unit__c,
                    unitPrice,
                    salePrice,
                    total
                };

                this.selectedProducts = [...this.selectedProducts, newProduct];
                this.updateDataTable();
            }
        }

        this.searchProductTerm = '';
        this.showProductDropdown = false;
    }

    //Data TAble Update
    updateDataTable() {
        if (!this.dataTableInstance) return;

        this.dataTableInstance.clear();

        this.selectedProducts.forEach((product, index) => {
            this.dataTableInstance.row.add([
                `<input style="text-align: center;" type="checkbox" />`,
                `<div style="text-align: left;">${product.code}</div>`,
                `<div style="text-align: left;">${product.description}</div>`,
                product.unitPrice === 0 ? '-' : product.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),

                `<input type="text" 
                    data-index="${index}" 
                    value="${(product.quantity || 0).toLocaleString(undefined, {maximumFractionDigits: 0 })}" 
                    min="0"
                    class="quantity-input"
                    style="width:100%; text-align: center;" />`,

                `<input type="text"
                    data-index="${index}" 
                    value="${(product.salePrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}"
                    min="0"
                    class="sale-price-input"
                    style="width:100%; text-align: center;" />`,
                `<div style="text-align: center;">${product.unit || '-'}</div>`,
                product.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            ]);
        });

        this.dataTableInstance.draw();

        // 👇 Add this block: Re-bind event listeners after draw
        setTimeout(() => {
            const table = this.template.querySelector('.product-table');

            const quantityInputs = table.querySelectorAll('.quantity-input');
            quantityInputs.forEach(input => {
                input.removeEventListener('change', this.handleQuantityChange);
                input.addEventListener('change', this.handleQuantityChange.bind(this));
            });

            const salePriceInputs = table.querySelectorAll('.sale-price-input');
            salePriceInputs.forEach(input => {
                input.removeEventListener('change', this.handleSalePriceChange);
                input.addEventListener('change', this.handleSalePriceChange.bind(this));
            });
        }, 0); // wait for DOM to render
    }

    //Function handleDeleteSelected
    handleDeleteSelected() {
        const table = this.template.querySelector('.product-table');
        const checkboxes = table.querySelectorAll('tbody input[type="checkbox"]:checked');
        const selectedCodes = new Set();

        checkboxes.forEach(checkbox => {
            const row = checkbox.closest('tr');
            const rowData = this.dataTableInstance.row(row).data();
            const match = rowData[1].match(/>(.*?)</);
            const materialCode = match ? match[1].trim() : null;
            if (materialCode) selectedCodes.add(materialCode);
        });

        if (selectedCodes.size === 0) {
            alert('กรุณาเลือกรายการที่ต้องการลบ');
            return;
        }

        if (!confirm('คุณต้องการลบรายการที่เลือกหรือไม่?')) return;

        this.selectedProducts = this.selectedProducts.filter(p => !selectedCodes.has(p.code));
        this.updateDataTable();
    }

    //handle Select All
    handleSelectAll(event) {
        const isChecked = event.target.checked;
        const checkboxes = this.template.querySelectorAll('tbody input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = isChecked);
    }

    renderedCallback() {
        const quantityInputs = this.template.querySelectorAll('.quantity-input')
        const salePriceInputs = this.template.querySelectorAll('.sale-price-input');

        quantityInputs.forEach(input => {
            input.addEventListener('change', this.handleQuantityChange.bind(this));
        });

        salePriceInputs.forEach(input => {
            input.addEventListener('change', this.handleSalePriceChange.bind(this));
        });
    }

    handleQuantityChange(event) {
        const index = Number(event.target.dataset.index);
        const newQty = parseFloat(event.target.value);
        const salePrice = this.selectedProducts[index].salePrice || 0;

        this.selectedProducts[index].quantity = isNaN(newQty) ? 0 : newQty;
        this.selectedProducts[index].total = salePrice * this.selectedProducts[index].quantity;

        this.updateDataTable();
    }


    handleSalePriceChange(event) {
        const index = Number(event.target.dataset.index);
        const newSalePrice = parseFloat(event.target.value);
        const quantity = this.selectedProducts[index].quantity || 0;

        this.selectedProducts[index].salePrice = isNaN(newSalePrice) ? 0 : newSalePrice;
        this.selectedProducts[index].total = this.selectedProducts[index].salePrice * quantity;

        this.updateDataTable();
    }

    handleCancel() {
        this.dispatchEvent(new CloseActionScreenEvent());
    }
}