public with sharing class inidQuotation {
    @AuraEnabled
    public static void insertProductPriceBook(List<INID_Product_Price_Book__c> products) {
        insert products;
    }
}