/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
define(['N/currentRecord', 'N/url', 'N/search', "N/record"], function (currentRecord, url, search, record) {

    let typeMode = "";
    function pageInit(context) {
        typeMode = context.mode;
        var currentRecord = context.currentRecord;
        console.log('typeMode', typeMode);
        if (typeMode == 'create' || typeMode == 'copy') {

            let serieEjec = currentRecord.getValue('custbody_pe_serie_guia_remision');
            currentRecord.setValue('custbody_pe_serie_cxp', serieEjec);
            
        }
    }

    return {
        pageInit: pageInit,
        //fieldChanged: fieldChanged
    }
});