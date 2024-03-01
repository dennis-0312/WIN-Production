function customizeGlImpact(transactionRecord, standardLines, customLines, book) {
    //nlapiLogExecution("DEBUG", "Inicio", 'INICIO-----------------------------');
    var accountToCredit = 0;
    var accountToDebit = 0;
    var accountMatchConsig = 0;
    var recordType = transactionRecord.getRecordType();
    var esconsignacion = transactionRecord.getFieldValue('custbody_pe_es_consignacion');
    var typeCreatedFrom = transactionRecord.getFieldValue('custbody_pe_flag_created_from');
    nlapiLogExecution("ERROR", "recordType", recordType);
    nlapiLogExecution("DEBUG", "esconsignacion", esconsignacion);
    nlapiLogExecution("DEBUG", "TypeCreatedFrom", typeCreatedFrom);

    if (recordType == 'itemreceipt') {
        nlapiLogExecution("DEBUG", "Consignación", 'INICIO Item Receipt -------------------------------------------------');
        try {
            if (typeCreatedFrom == 'purchaseorder' && esconsignacion == 'T') {
                
            } else if (typeCreatedFrom == 'transferorder') {
                
            }
        } catch (error) {
            nlapiLogExecution('ERROR', 'ItemReceipt', error);
        }
        nlapiLogExecution("DEBUG", "Consignación", 'FINISH Item Receipt -------------------------------------------------');
    } else if (recordType == 'itemfulfillment') {
        nlapiLogExecution("DEBUG", "Consignación", 'INICIO Item Fulfillment -------------------------------------------------');
        try {
            if (typeCreatedFrom == 'salesorder') {
                
                /*
                var countStandard = parseInt(standardLines.getCount());
                nlapiLogExecution('ERROR', 'countStandard', countStandard);
                for (var j = 1; j < countStandard; j++){
                    var enti = standardLines.getLine(j).getEntityId();
                    var depa = standardLines.getLine(j).getDepartmentId();
                    var cla = standardLines.getLine(j).getClassId();
                    var loca = standardLines.getLine(j).getLocationId();
                    
                    nlapiLogExecution('ERROR', 'enti', enti);
                    nlapiLogExecution('ERROR', 'depa', depa);
                    nlapiLogExecution('ERROR', 'cla', cla);
                    nlapiLogExecution('ERROR', 'loca', loca);
                }
                */

                var countTransaction = transactionRecord.getLineItemCount('item');
                nlapiLogExecution('ERROR', 'countTransaction', countTransaction);
                
                for (var i = 1; i <= countTransaction; i++){
                    var sku = transactionRecord.getLineItemText('item', 'item', i);
                    var articulo = transactionRecord.getLineItemValue('item', 'item', i);
                    var cantidad = transactionRecord.getLineItemValue('item', 'quantity', i);
                    var location = Number(transactionRecord.getLineItemValue('item', 'location', i));
                    var precio_prom = parseFloat(transactionRecord.getLineItemValue('item', 'custcol_pe_average_cost', i));

                    nlapiLogExecution('ERROR', 'location', location);
                    
                    if(Number(cantidad) != 0){
                        var inventoryitemSearch = nlapiSearchRecord("inventoryitem",null,
                            [
                                ["type","anyof","InvtPart"], 
                                "AND", 
                                ["internalidnumber","equalto",articulo], 
                                "AND", 
                                ["inventorylocation","anyof",location]
                            ], 
                            [ 
                                new nlobjSearchColumn("assetaccount"), 
                                new nlobjSearchColumn("expenseaccount"),
                            ]
                        );
                        
                        if (inventoryitemSearch){
                            var cuenta_activo = inventoryitemSearch[0].getValue("assetaccount");
                            var cuenta_costo =  inventoryitemSearch[0].getValue("expenseaccount");

                            /*
                            nlapiLogExecution('ERROR', 'sku', sku);
                            nlapiLogExecution('ERROR', 'articulo', articulo);
                            nlapiLogExecution('ERROR', 'cantidad', cantidad);
                            nlapiLogExecution('ERROR', 'precio_prom', precio_prom);
                            nlapiLogExecution('ERROR', 'cuenta_activo', cuenta_activo);
                            nlapiLogExecution('ERROR', 'cuenta_costo', cuenta_costo);
                            */

                            var field_cuenta = ['type','number'];
                            var cuentaFields = nlapiLookupField('account', cuenta_activo, field_cuenta);

                            var tipo_cuenta = cuentaFields.type;
                            var numero_cuenta = cuentaFields.number;
                            nlapiLogExecution('ERROR', 'tipo_cuenta', tipo_cuenta);

                            if(tipo_cuenta == 'FixedAsset'){
                                var num_ini = numero_cuenta.substr(0, 2)
                                if(num_ini == '33'){
                                    var monto = cantidad * precio_prom;
                                    monto = monto.toFixed(2);
                                    var newLine = customLines.addNewLine();
                                    newLine.setDebitAmount(monto);
                                    newLine.setAccountId(Number(cuenta_activo));
                                    newLine.setEntityId(standardLines.getLine(0).getEntityId());
                                    newLine.setDepartmentId(standardLines.getLine(0).getDepartmentId());
                                    newLine.setClassId(standardLines.getLine(0).getClassId());
                                    newLine.setLocationId(location);
                                    newLine.setMemo(sku);
                                    var newLine = customLines.addNewLine();
                                    newLine.setCreditAmount(monto);
                                    newLine.setAccountId(Number(cuenta_costo));
                                    newLine.setEntityId(standardLines.getLine(0).getEntityId());
                                    newLine.setDepartmentId(standardLines.getLine(0).getDepartmentId());
                                    newLine.setClassId(standardLines.getLine(0).getClassId());
                                    newLine.setLocationId(location);
                                    newLine.setMemo(sku);
                                }
                            }

                        }
                    }

                    
                }
                
            } else if (typeCreatedFrom == 'vendorreturnauthorization' && esconsignacion == 'T') {
                
            } else if (typeCreatedFrom == 'transferorder') {
                
            }
        } catch (error) {
            nlapiLogExecution('ERROR', 'ItemFulfillment', error);
        }
        nlapiLogExecution("DEBUG", "Consignación", 'FIN Item Fulfillment -------------------------------------------------');
    } else if (recordType == 'cashsale') {
        nlapiLogExecution("DEBUG", "Consignación", 'INICIO Cash Sale -------------------------------------------------');
        try {
            
        } catch (error) {
            nlapiLogExecution('ERROR', 'Cash Sale', error);
        }
        nlapiLogExecution("DEBUG", "Consignación", 'FIN Cash Sale -----------------------------------------------------');
    }
}