/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
*/
define(['N/record', 'N/search', 'N/runtime'], function (record, search, runtime){

    const FACTURA_VENTA = 'invoice';
    const FACTURA_COMPRA = 'vendorbill';
    const GASTO = 'expense';
    const ITEM = 'item';
    
    function pageInit(context){
        try {
            const currentRecord = context.currentRecord;
            const typeMode = context.mode;
            const typeTransaction = currentRecord.type;

            if (typeMode == 'edit' || typeMode == 'copy'){
                if(typeTransaction == FACTURA_COMPRA){
                    var details_expense = currentRecord.getLineCount(GASTO);
                    var details_item_vent = currentRecord.getLineCount(ITEM);
                    console.log('details_item_vent',details_item_vent);
                    if (details_expense > 0) {
                        setTimeout(function () {
                            removeLinesAjusteDetraccion(currentRecord, details_expense, GASTO);
                        }, 300)
                    }
                    if (details_item_vent > 0) {
                        setTimeout(function () {
                            removeLinesAjusteDetraccion(currentRecord, details_item_vent, ITEM);
                        }, 300)
                    }
                }
            }
        } catch (error) {
            console.log('error',error);
        }
    }

    function removeLinesAjusteDetraccion(_record, _details, _sublist) {
        try {
            for (var s = _details - 1; s >= 0; s--) {
                var is_line_ajuste_ret = _record.getSublistValue({ sublistId: _sublist, fieldId: 'custcol_pe_linea_ajuste_retencion', line: s });
                console.log('is_line_ajuste_ret',is_line_ajuste_ret);
                if (is_line_ajuste_ret){
                    _record.removeLine({ sublistId: _sublist, line: s });
                }
            }
        } catch (e) {
            console.log('Error en removeLinesAjusteDetraccion', e);
        }
    }

    return {
        pageInit: pageInit,
        //saveRecord: saveRecord,
        // validateField: validateField,
        // fieldChanged: fieldChanged,
        // postSourcing: postSourcing,
        // lineInit: lineInit,
        // validateDelete: validateDelete,
        //validateInsert: validateInsert,
        // validateLine: validateLine,
        // sublistChanged: sublistChanged
    }

});