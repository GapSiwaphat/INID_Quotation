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
            SELECT Id , INID_Material_Code__c , INID_SKU_Description__c , INID_Quantity__c , INID_Sale_Price__c , INID_Product_Price_Book__c , INID_Product_Price_Book__r.INID_Unit_Price__c , INID_Product_Price_Book__r.Id , INID_Product_Price_Book__r.INID_Unit__c , INID_Item_Number__c
            FROM INID_Quote_Item__c                                                                          
            WHERE INID_Quote__c = :quoteId 
        ];
    }

    @AuraEnabled
    public static void deleteQuoteItems(List<Id> quoteItemIds) {
        try {
            List<INID_Quote_Item__c> toDelete = [
                SELECT Id FROM INID_Quote_Item__c WHERE Id IN :quoteItemIds
            ];
            delete toDelete;
        } catch (Exception e) {
            throw new AuraHandledException('เกิดข้อผิดพลาดในการลบข้อมูล: ' + e.getMessage());
        }
    }
}