/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
*/
define(['N/search', 'N/record', 'N/runtime', 'N/task'], function (search, record, runtime, task){

    const FACTURA_COMPRA = 'vendorbill';
    const FACTURA_VENTA = 'invoice';
    const PE_Anticipo_detracciones = 19;
    const UNDEF_PE = 5;
    const GASTO = 'expense';
    const ITEM = 'item';
    const CONCEPTO_SIN_DETRACCION = 1;

    function beforeLoad(context){

    }

    function beforeSubmit(context){
        const oldRecord = context.oldRecord;
        const objRecord = context.newRecord;
        const eventType = context.type;

        try {
            if (eventType != context.UserEventType.DELETE){
                if (objRecord.type == FACTURA_VENTA){
                    
                }
            }
        } catch (error) {
            log.error('error-beforeSubmit',error);
        }

    }

    function afterSubmit(context){
        const eventType = context.type;
        const oldObjRecord = context.oldRecord;
        log.error('eventType',eventType);
        try {
            if (eventType != context.UserEventType.DELETE){
                const objRecord = context.newRecord;
                var recordId = objRecord.id;
                var recordLoad = '';
                
                if (objRecord.type == FACTURA_COMPRA){
                    recordLoad = record.load({ type: objRecord.type, id: recordId, isDynamic: false });
                    const account_factura_compra = recordLoad.getValue('account');
                    const concepto_retencion = recordLoad.getValue('custbody_pe_concept_detraction');
                    const details_expense = recordLoad.getLineCount(GASTO);
                    const details_item = recordLoad.getLineCount(ITEM);
                    var currency = recordLoad.getValue('currency');

                    if (concepto_retencion){
                        if (concepto_retencion != CONCEPTO_SIN_DETRACCION){
                            if (details_item > 0) removeLinesAjusteDetraccion(recordLoad, details_item, ITEM);
                            //if (details_expense > 0) removeLinesAjusteDetraccion(recordLoad, details_expense, GASTO);
                            const tipo_cambio_fc = recordLoad.getValue('exchangerate');
                            const rate_detraccion = recordLoad.getValue('custbody_pe_percentage_detraccion') * (0.01);

                            var subSearch = search.lookupFields({
                                type: 'subsidiary',
                                id: recordLoad.getValue('subsidiary'),
                                columns: ['custrecord_pe_detraccion_account', 'custrecord_pe_detraccion_account_dol']
                            });

                            if(MONEDA_SOLES == currency){
                                var account = subSearch.custrecord_pe_detraccion_account[0].value;
                            } else {
                                var account = subSearch.custrecord_pe_detraccion_account_dol[0].value
                            }
                            log.debug('account',account);

                            if (details_expense > 0){
                                var total_expense_ret = 0;
                                var total_amount = 0;

                                for (var k = 0; k < details_expense; k++){
                                    var manual_ret = recordLoad.getSublistValue({ sublistId: GASTO, fieldId: 'custcol_pe_retencion_manual', line: k });
                                    var flag = recordLoad.getSublistValue({ sublistId: GASTO, fieldId: 'custcol_pe_linea_ajuste_retencion', line: k });
                                    if(manual_ret == false){
                                        var amount = roundTwoDecimal(recordLoad.getSublistValue({ sublistId: GASTO, fieldId: 'grossamt', line: k }) || 0);
                                        var monto_expense_ret_ln = recordLoad.getSublistValue({ sublistId: GASTO, fieldId: 'custcol_4601_witaxbamt_exp', line: k }) || 0;
                                        log.debug('Montos de columnas ' + k, amount + '->> ' + monto_expense_ret_ln);
                                        if (monto_expense_ret_ln != 0) {
                                            total_expense_ret += monto_expense_ret_ln;
                                        }
                                        total_amount = roundTwoDecimal(total_amount + amount);
                                        log.debug('Montos de Total ' + k, total_amount );
                                    }
                                }

                                log.debug('Montos previos', total_expense_ret + ' -> '+ rate_detraccion +  ' -> ' + tipo_cambio_fc)
                                const amount_ret_exp = Math.round(total_expense_ret * rate_detraccion * 100) / 100 * (-1);
                                const amount_line_ret_expense = getResiduoRetencion(amount_ret_exp, tipo_cambio_fc);
                                log.debug('Montos despues', amount_ret_exp + ' -> ' + amount_line_ret_expense)
                                const dif_redondeo = Math.abs(amount_line_ret_expense.toFixed(2)) - Math.abs(amount_line_ret_expense);

                                if(amount_line_ret_expense != 0 && !flag){

                                    recordLoad.setSublistValue({ sublistId: GASTO, fieldId: 'account', line: details_expense, value: account });
                                    recordLoad.setSublistValue({ sublistId: GASTO, fieldId: 'amount', line: details_expense, value: roundTwoDecimal(amount_line_ret_expense) });
                                    recordLoad.setSublistValue({ sublistId: GASTO, fieldId: 'taxcode', line: details_expense, value: UNDEF_PE });
                                    recordLoad.setSublistValue({ sublistId: GASTO, fieldId: 'department', line: details_expense, value: recordLoad.getSublistValue({ sublistId: GASTO, fieldId: 'department', line: 0 }) });
                                    recordLoad.setSublistValue({ sublistId: GASTO, fieldId: 'class', line: details_expense, value: recordLoad.getSublistValue({ sublistId: GASTO, fieldId: 'class', line: 0 }) });
                                    recordLoad.setSublistValue({ sublistId: GASTO, fieldId: 'location', line: details_expense, value: recordLoad.getSublistValue({ sublistId: GASTO, fieldId: 'location', line: 0 }) });
                                    recordLoad.setSublistValue({ sublistId: GASTO, fieldId: 'custcol_pe_linea_ajuste_retencion', line: details_expense, value: true });
                                    recordLoad.setSublistValue({ sublistId: GASTO, fieldId: 'custcol_pe_detraccion_redondeo', line: details_expense, value: amount_line_ret_expense });
                                    recordLoad.setSublistValue({ sublistId: GASTO, fieldId: 'custcol_pe_diferencia_redondeo', line: details_expense, value: dif_redondeo });
                                    recordLoad.setSublistValue({ sublistId: GASTO, fieldId: 'custcol_pe_det_red_dec', line: details_expense, value: amount_line_ret_expense });
                                    recordLoad.setSublistValue({ sublistId: GASTO, fieldId: 'custcol_pe_dif_red_dec', line: details_expense, value: dif_redondeo });
                                }

                            }

                            if (details_item > 0) {
                                log.debug('Entro al item')
                                var total_item_ret = 0;
                                for (var k = 0; k < details_item; k++) {
                                    var manual_ret = recordLoad.getSublistValue({ sublistId: ITEM, fieldId: 'custcol_pe_retencion_manual', line: k });
                                    var flag = recordLoad.getSublistValue({ sublistId: ITEM, fieldId: 'custcol_pe_linea_ajuste_retencion', line: k });
                                    
                                    log.debug('manual', manual_ret)
                                    if(manual_ret == false){
                                        var monto_item_ret_ln = recordLoad.getSublistValue({ sublistId: ITEM, fieldId: 'custcol_4601_witaxbaseamount', line: k }) || 0;
                                        log.debug('monnto', monto_item_ret_ln)
                                        if (monto_item_ret_ln != 0) {
                                            total_item_ret += monto_item_ret_ln
                                        }
                                    }
                                    
                                }
                                log.debug('monnto 2', total_item_ret)

                                var discountitemSearchObj = search.create({
                                    type: "discountitem",
                                    filters:
                                    [
                                       ["type","anyof","Discount"], 
                                       "AND", 
                                       ["account","anyof",account]
                                    ],
                                    columns:
                                    [
                                       search.createColumn({name: "internalid", label: "Internal ID"})
                                    ]
                                 });
                               
                                var searchResultCount = discountitemSearchObj.run().getRange(0,1);
                                if(searchResultCount.length != 0){
                                    var columns = searchResultCount[0].columns;
                                    var itemDis = searchResultCount[0].getValue(columns[0]);
                                    
                                }
                                log.debug('itemDis',itemDis)
                                const amount_ret_item = total_item_ret * rate_detraccion * (-1);
                                const amount_line_ret_item = getResiduoRetencion(amount_ret_item, tipo_cambio_fc);
                                log.error("dif_redondeo", amount_ret_item);
                                log.error("amount_line_ret_expense", amount_line_ret_item);
                                log.debug('flaaaaaaag', flag)
                                if(amount_line_ret_item != 0 && !flag){
                                    recordLoad.setSublistValue({ sublistId: ITEM, fieldId: 'item', line: details_item, value: itemDis});
                                    recordLoad.setSublistValue({ sublistId: ITEM, fieldId: 'quantity', line: details_item, value: recordLoad.getSublistValue({ sublistId: ITEM, fieldId: 'quantity', line: 0 }) });
                                    recordLoad.setSublistValue({ sublistId: ITEM, fieldId: 'description', line: details_item, value: recordLoad.getSublistValue({ sublistId: ITEM, fieldId: 'description', line: 0 }) });
                                    recordLoad.setSublistValue({ sublistId: ITEM, fieldId: 'rate', line: details_item, value: amount_line_ret_item });
                                    recordLoad.setSublistValue({ sublistId: ITEM, fieldId: 'taxcode', line: details_item, value: UNDEF_PE });
                                    recordLoad.setSublistValue({ sublistId: ITEM, fieldId: 'department', line: details_item, value: recordLoad.getSublistValue({ sublistId: ITEM, fieldId: 'department', line: 0 }) });
                                    recordLoad.setSublistValue({ sublistId: ITEM, fieldId: 'class', line: details_item, value: recordLoad.getSublistValue({ sublistId: ITEM, fieldId: 'class', line: 0 }) });
                                    recordLoad.setSublistValue({ sublistId: ITEM, fieldId: 'location', line: details_item, value: recordLoad.getSublistValue({ sublistId: ITEM, fieldId: 'location', line: 0 }) });
                                    recordLoad.setSublistValue({ sublistId: ITEM, fieldId: 'custcol_pe_linea_ajuste_retencion', line: details_item, value: true });

                                }
                                
                            }
                            recordLoad.save({ ignoreMandatoryFields: true, enableSourcing: false });

                        }
                    }
                }

            }
        } catch (error) {
            log.error('error-beforeSubmit',error);
        }
    }

    function getResiduoRetencion(_total_retencion, _tipo_cambio) {
        try {
            const total_retencion_tc = _total_retencion * _tipo_cambio;
            const total_redondeo = Math.round(Math.abs(total_retencion_tc)) * -1;
            var total_resto = total_redondeo + Math.abs(total_retencion_tc);
            total_resto = total_resto / _tipo_cambio;
            return total_resto;

        } catch (e) {
            log.error('Error en getResiduoRetencion', e);
        }
    }

    function removeLinesAjusteDetraccion(_record, _details, _sublist) {
        try {
            for (var s = _details - 1; s >= 0; s--) {
                var is_line_ajuste_ret = _record.getSublistValue({ sublistId: _sublist, fieldId: 'custcol_pe_linea_ajuste_retencion', line: s });
                
                if (is_line_ajuste_ret){
                    _record.removeLine({ sublistId: _sublist, line: s });
                }
            }
        } catch (e) {
            log.error("error", e);
        }
    }

    function roundTwoDecimal(value) {
        return Math.round(Number(value) * 100) / 100;
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }

});