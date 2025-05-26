public with sharing class inidQuotation {
    @AuraEnabled()
    public static void insertProductPriceBook(List<INID_Quote_Item__c> products) {
        insert products;
    }


    @AuraEnabled(cacheable=true)
    public static String getRecordId(Id quoteId) {
         return quoteId;
    }

}