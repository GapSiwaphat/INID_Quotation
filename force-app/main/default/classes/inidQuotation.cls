public with sharing class inidQuotation {
    @AuraEnabled()
    public static void insertQuoteItem(List<INID_Quote_Item__c> products) {
        upsert products;
    }

    @AuraEnabled(cacheable=true)
    public static String getRecordId(Id quoteId) {
         return quoteId;
    }

    @AuraEnabled(cacheable=true)
    public static List<INID_Quote_Item__c> fetchQuoteItemById(Id quoteId) {
        return [
            SELECT INID_Material_Code__c , INID_SKU_Description__c , INID_Quantity__c , INID_Sale_Price__c , INID_Product_Price_Book__c , INID_Product_Price_Book__r.INID_Unit_Price__c , INID_Product_Price_Book__r.Id , INID_Product_Price_Book__r.INID_Unit__c
            FROM INID_Quote_Item__c                                                                          
            WHERE INID_Quote__c = :quoteId 
        ];
    }

}