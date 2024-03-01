/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
 define(['N/record', 'N/log', 'N/search', 'N/file', 'N/runtime'], function (record, log, search, file, runtime) {
    const PE_FEL_Sending_Method = 4;
    const PE_Invoice_FEL_Template = 1;
 
    function beforeSubmit(context) {
        try {
            var COD_RETENCION_IMPUESTOS = runtime.getCurrentScript().getParameter({
                name: 'custscript_pe_ue_retencion_cod'
            });
            var TIPO_COMPROBANTE_RET = runtime.getCurrentScript().getParameter({
                name: 'custscript_pe_ue_retencion_type_doc'
            })
            var CUSTOM_FORM_RETENCION = runtime.getCurrentScript().getParameter({
                name: 'custscript_pe_ue_retencion_form'
            });
            var RECORD_SERIE_RETENCION = runtime.getCurrentScript().getParameter({
                name: 'custscript_pe_ue_retencion_serie'
            });  
            var CUENTA_CONTABLE = runtime.getCurrentScript().getParameter({
                name: 'custscript_pe_ue_retencion_account'
            });
           
            CUENTA_CONTABLE = '2754'; //401141 IGV-REGIMEN DE RETENCIONES
            TIPO_COMPROBANTE_RET = '16';
            CUSTOM_FORM_RETENCION = '104'; //Formulario
            log.debug('context.type',context.type);
 
            if (context.type === context.UserEventType.CREATE//Pago Individual btn Realizar pago, Pago Individual pagar a un proveedor, Pago masivo TEF
                || context.type === context.UserEventType.PAYBILLS//Pago Masivo pagar facturas
                //|| context.type === context.UserEventType.EDIT//Solo para probar
            ) {
                log.debug('MSK', 'Entré al IF');
 
                //!1.0 Recuperando la data del Pago
                let generaComprobanteRetencion = false;
                let total_retencion = 0;
                let memo = ''
 
                //let currentRecord = record.load({ type: context.newRecord.type, id: context.newRecord.id, isDynamic: true });//Mucho mejor, todos los campos ya están seteados
                let currentRecord = context.newRecord;//Toma los datos del pago, pero todos no están seteados (transactionnumber por ejemplo aun no está seteado)
 
                var entity = currentRecord.getValue('entity');
                var exchangerate = currentRecord.getValue('exchangerate');//TIPO CAMBIO
                var currency = currentRecord.getValue('currency'); //1 : Soles   2: Dolares
                var department = currentRecord.getValue('department');
                var class_ = currentRecord.getValue('class');
                var location = currentRecord.getValue('location');
                var transactionnumber = currentRecord.getValue('transactionnumber');
                var applyCount = currentRecord.getLineCount({ sublistId: 'apply' });
                var subsidiary = currentRecord.getValue('subsidiary');
                var total_documento_pago = currentRecord.getValue('total');
                var total_documento_pago_soles = parseFloat(total_documento_pago) * parseFloat(exchangerate);
                var total_facturas_involucradas = 0;
 
                var cuenta = currentRecord.getValue('apacct');
 
                var searchLoadSubsidiaria = search.create({
                    type: 'subsidiary', filters: [
                        ['internalid', 'is', subsidiary]
                    ],
                    columns: [
                        'custrecord_pe_is_wht_agent',
                        'custrecord_pe_detraccion_account',
                        'custrecord_pe_detraccion_account_dol'
                    ]
                });
                log.debug('MSK', 'traza 1');
                const searchResultSubsidiaria = searchLoadSubsidiaria.run().getRange({ start: 0, end: 1 });
                let custrecord_pe_is_wht_agent = searchResultSubsidiaria[0].getValue(searchLoadSubsidiaria.columns[0]);
                var cuenta_soles = searchResultSubsidiaria[0].getValue(searchLoadSubsidiaria.columns[1]);
                var cuenta_dolares = searchResultSubsidiaria[0].getValue(searchLoadSubsidiaria.columns[2]);
 
                log.debug('MSK', 'custrecord_pe_is_wht_agent ('+subsidiary+') = ' + custrecord_pe_is_wht_agent);
 
                if (custrecord_pe_is_wht_agent=="true" || custrecord_pe_is_wht_agent==true)
                {
                    log.debug('MSK', 'subsidiary = '+subsidiary+' --> - Aplica Retención');
                    //!1.1 Recuperando datos del Vendor
                    vendorRecord = record.load({ type: record.Type.VENDOR, id: entity, isDynamic: true });
                    var CodRetencionImpuestos = vendorRecord.getValue({ fieldId: 'custentity_4601_defaultwitaxcode' });
                    log.debug('MSK', 'CodRetencionImpuestos [VendorId=' + entity + ']: ' + CodRetencionImpuestos);
 
                    if (CodRetencionImpuestos == COD_RETENCION_IMPUESTOS) //Proveedor tiene código de retención de impuesto (RETIGV:3%)
                    {
                        // log.debug('MSK', 'traza 1');
                        //!1.2 Recuperando los Items que se pagaron
                        let referencias = []
                        log.debug('applyCount', applyCount);
                        for (var i = 0; i < applyCount; i++) {
                            // log.debug('MSK', 'traza 3 -> i='+i);
                            var apply = currentRecord.getSublistValue({ sublistId: 'apply', fieldId: 'apply', line: i });
                            var trantype = currentRecord.getSublistValue({ sublistId: 'apply', fieldId: 'trantype', line: i });
                            var idFactura = currentRecord.getSublistValue({ sublistId: 'apply', fieldId: 'doc', line: i });
                            var refnum = currentRecord.getSublistValue({ sublistId: 'apply', fieldId: 'refnum', line: i });
                            var total = currentRecord.getSublistValue({ sublistId: 'apply', fieldId: 'total', line: i });
                            var amount = currentRecord.getSublistValue({ sublistId: 'apply', fieldId: 'amount', line: i });
                            var fec_emi_fc = currentRecord.getSublistValue({ sublistId: 'apply', fieldId: 'applydate', line: i });
 
                            log.debug('apply', apply);
                            // log.debug('MSK', 'traza 4 -> i='+i);
                            if ((apply == true || apply == "T") && trantype == 'VendBill') {
                                let referencia = {}
                                referencia.line = i
                                referencia.amount = amount
                                referencia.trantype = trantype
                                referencia.id = idFactura
                                referencia.refnum = refnum
                                //referencia.importe_original_soles = (parseFloat(total) * parseFloat(exchangerate)).toFixed(2)
                                //referencia.importe_pagado_soles = (parseFloat(amount) * parseFloat(exchangerate)).toFixed(2)
                                referencia.importe_original_soles = (parseFloat(total)).toFixed(2)
                                referencia.importe_pagado_soles = (parseFloat(amount)).toFixed(2)
                                referencia.fec_emi_fc = fec_emi_fc
                                referencias.push(referencia)
                                log.debug('referencia qq',referencia);
                                log.debug('referencias',referencias);
                                total_facturas_involucradas = parseFloat(total_facturas_involucradas) + parseFloat(referencia.importe_original_soles);
                                log.debug('MSK', 'refnum='+refnum+', referencia.importe_original_soles ='+referencia.importe_original_soles);
                               
                            }
                            log.debug('total_facturas_involucradas', total_facturas_involucradas);
 
                        }
                        log.debug('referencias final', referencias);
 
                        if (total_facturas_involucradas >= 700) {
                            //!1.3 Recorriendo los Items que se pagaron y recuperando los periodos
                            for (var i = 0; i < referencias.length; i++) {
                                // log.debug('MSK', 'mi traza 1-> i='+i);
                                let aplica_retencion = false;
                                let retencion_item = 0
                                let suma_periodo = 0;
                                let id_factura_actual = referencias[i].id
                                let esFacturaDetraccion = false
                                // log.debug('MSK', 'mi traza 2-> i='+i);
                                if (referencias[i].trantype == 'VendBill') {
                                    vendorBillRecord = record.load({
                                        type: record.Type.VENDOR_BILL,
                                        id: referencias[i].id
                                    });
                                    // log.debug('MSK', 'mi traza 3-> i='+i);
                                    var periodo = vendorBillRecord.getValue({ fieldId: 'postingperiod' });
                                    var periodoDescripcion = vendorBillRecord.getText({ fieldId: 'postingperiod' });
                                    var trandate = vendorBillRecord.getText({ fieldId: 'trandate' });
                                    referencias[i].periodo_cod = periodo
                                    referencias[i].periodo_des = periodoDescripcion
                                    referencias[i].trandate = trandate
                                }
                                // log.debug('MSK', 'mi traza 4-> i='+i);
 
                                if (referencias[i].periodo_des != null && referencias[i].periodo_des != "") {
                                    //!1.3.1 Verificar si para ese periodo se aplica o no retención
 
                                    // log.debug('MSK', 'mi traza 4-> i='+i);
                                    //!1.3.1.1 - Recorriendo Facturas de Detracción
                                    var facturaSearch_det = search.load({ id: 'customsearch_pe_facturas_proveedor_det' });
                                    facturaSearch_det.filters.push(search.createFilter({ name: 'entity', operator: search.Operator.IS, values: entity }));
                                    facturaSearch_det.filters.push(search.createFilter({ name: 'postingperiod', operator: search.Operator.IS, values: referencias[i].periodo_cod }));
                                    var resultSet_det = facturaSearch_det.run();
                                    let contador_det = 0;
                                    let lst_facturas_detraccion = []
                                    resultSet_det.each(function (result) {
                                        contador_det++;
                                        var internalid = result.getValue({ name: 'internalid', summary: search.Summary.GROUP });
                                        if (id_factura_actual == internalid) {
                                            esFacturaDetraccion = true;
                                        }
                                        lst_facturas_detraccion.push(internalid)
                                        return true;
                                    });
                                    // log.debug('MSK', "lst_facturas_detraccion = " + lst_facturas_detraccion)
                                    referencias[i].esFacturaDetraccion = esFacturaDetraccion
                                    log.debug('esFacturaDetraccion',esFacturaDetraccion)
                                    if (!esFacturaDetraccion) {
                                        aplica_retencion = true;//item
                                        generaComprobanteRetencion = true;//general
                                        total_retencion = total_retencion + parseFloat(referencias[i].importe_pagado_soles) * 0.03;
                                        retencion_item = (parseFloat(referencias[i].importe_pagado_soles) * 0.03).toFixed(2)
                                    }
                                }
                                referencias[i].aplica_retencion = aplica_retencion
                                referencias[i].retencion_item = retencion_item
 
                            }
 
                            log.debug('referencias', referencias);
 
                            // //!2.0 Registrando el Comprobante de Retención
                            if (generaComprobanteRetencion) {
                                log.debug('MSK', 'Se creará Comprobante Retencion');
                                total_retencion = total_retencion.toFixed(2)
                                var vendorCredit = record.create({
                                    type: record.Type.VENDOR_CREDIT,
                                    isDynamic: true
                                });
 
                                log.debug('cuenta', cuenta);
                                vendorCredit.setValue('customform', CUSTOM_FORM_RETENCION); // ID interno del formulario personalizado para "PE Comprobante de Retención" 129->313
                                vendorCredit.setValue('entity', entity); // Proveedor
                                vendorCredit.setValue('account', cuenta);
                                vendorCredit.setValue('subsidiary', subsidiary);
                                vendorCredit.setValue('custbody_pe_document_type', TIPO_COMPROBANTE_RET); // Tipo Comprobante -> Retención
                                vendorCredit.setValue('total', total_retencion); // Total del comprobante
                                vendorCredit.setValue('memo', 'Comprobante Retencion'); // descripcion
                                vendorCredit.setValue('currency', currency);//Moneda Simpre en soles
                                //vendorCredit.setValue('currency', 1);//Moneda Simpre en soles
 
                                //!2.1 Buscar el correativo
                                //var recordId = RECORD_SERIE_RETENCION;//Id correspondiente a serie de Retención
                                //PE TIPO DE DOCUMENTO SERIE (Comprobante de Retencion): 16
                               
                                searchLoad = search.create({
                                    type: 'customrecord_pe_serie', filters: [
                                        ['custrecord_pe_tipo_documento_serie', 'is', TIPO_COMPROBANTE_RET],
                                        'AND',
                                        ['custrecord_pe_subsidiaria','is',subsidiary]
                                    ],
                                    columns: [
                                        'custrecord_pe_serie_impresion',
                                        'custrecord_pe_inicio',
                                        'internalid'
                                    ]
                                });
                                log.debug('MSK', 'traza 1');
                                const searchResult = searchLoad.run().getRange({ start: 0, end: 1 });
                                let serie = searchResult[0].getValue(searchLoad.columns[0]);
                                let correlativo = (searchResult[0].getValue(searchLoad.columns[1]) + "").padStart(8, '0');
                                let corrltv = parseInt(searchResult[0].getValue(searchLoad.columns[1]));
                                var recordId = searchResult[0].getValue(searchLoad.columns[2]);
                                var record1 = record.load({ type: 'customrecord_pe_serie', id: recordId });
                                record1.setValue({ fieldId: 'custrecord_pe_inicio', value: (corrltv + 1) + "" });
                                record1.save();
                                log.debug('MSK', 'traza 2');
 
                                //!2.2 Llenando el correlativo
                                let location_value = location
                                vendorCredit.setValue('custbody_pe_serie_cxp', serie);
                                vendorCredit.setValue('custbody_pe_number', correlativo);
                                vendorCredit.setValue('location', location_value);
                                vendorCredit.setValue('tranid', serie + "-" + correlativo);
 
                                log.debug('MSK', 'traza 3->'+serie+'|'+correlativo+'|'+5+'|'+serie + "-" + correlativo);
                                log.debug('referencias',referencias)
                                referencias.forEach(function (dataItem) {
                                    log.debug('dataItem.aplica_retencion',dataItem.aplica_retencion);
                                    if (dataItem.aplica_retencion) {
                                        log.debug('MSK', 'traza 3.1');
                                        vendorCredit.selectNewLine({ sublistId: 'expense' });
                                        vendorCredit.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'account', value: CUENTA_CONTABLE }); // ID de cuenta contable para el gasto
                                        vendorCredit.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'amount', value: dataItem.retencion_item }); // Monto del gasto
                                        vendorCredit.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'taxcode', value: 5 }); // Tipo Impuesto
                                        vendorCredit.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'department', value: department });
                                        vendorCredit.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'class', value: class_ });
                                        vendorCredit.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'location', value: location_value });//Obligatorio en TSNET
                                     
                                        log.debug('MSK', 'traza 3.2');
                                        vendorCredit.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'custcol_pe_factura_ln', value: dataItem.refnum });
                                        vendorCredit.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'custcolpe_imp_original_ln', value: dataItem.importe_original_soles });
                                        vendorCredit.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'custcol_pe_imp_pagado_ln', value: dataItem.importe_pagado_soles });
                                        vendorCredit.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'custcol_pe_ln_fec_emi_fc', value: dataItem.fec_emi_fc });
                                        log.debug('MSK', 'traza 3.3');
                                        vendorCredit.commitLine({ sublistId: 'expense' });
 
                                        log.debug('MSK', 'traza 4');
                                        //!20230831
                                        var amount_sin_retencion = (0.97 * parseFloat(dataItem.amount)).toFixed(2)
                                        log.debug('MSK', 'refnum=' + dataItem.refnum + ', amount-antes=' + dataItem.amount + ', amount_sin_retencion=' + amount_sin_retencion)
                                        //currentRecord.selectLine({ sublistId: 'apply', line: dataItem.line });
                                        //currentRecord.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'amount', value: amount_sin_retencion });
                                        currentRecord.setSublistValue({ sublistId: 'apply', fieldId: 'amount', value: amount_sin_retencion, line: dataItem.line });
                                        //currentRecord.commitLine({ sublistId: 'apply' });
                                        log.debug('MSK', 'cambio OK')
                                        log.debug('MSK', 'traza 5');
                                    }
                                });
 
                                log.debug('MSK', 'Antes de actualizar documento de pago')
 
                                vendorCredit.setValue('custbody_psg_ei_template', PE_Invoice_FEL_Template);
                                vendorCredit.setValue('custbody_psg_ei_sending_method', PE_FEL_Sending_Method);
                                vendorCredit.setValue('custbody_psg_ei_status', 1);
 
                                //currentRecord.save()

                                log.debug('MSK', 'Despues de actualizar documento de pago')
 
                                var vendorCreditId = vendorCredit.save();
                                log.debug('MSK', 'Se creó Comprobante de Retención [' + vendorCreditId + '] -> ' + serie + '-' + correlativo);
 
 
                                //!APPLY
                                log.debug('MSK', 'Vamos a modificar el documento de retención');
                                var vendorCreditUpd = record.load({
                                    type: record.Type.VENDOR_CREDIT, // Tipo de registro Vendor Credit
                                    id: vendorCreditId, // Reemplaza con el ID de tu registro Vendor Credit
                                    isDynamic: true
                                });
                                log.debug('MSK', 'previo a applyCount');
                                var applyCount = vendorCreditUpd.getLineCount({ sublistId: 'apply' });
                                log.debug('MSK', 'applyCount=' + applyCount);
                                var contadorRef = 0
                                referencias.forEach(function (dataItem) {
                                    log.debug('MSK', 'referencias[' + contadorRef + ']');
                                    if (dataItem.aplica_retencion) {
                                        for (var i = 0; i < applyCount; i++) {
                                            log.debug('MSK', 'dataItem[' + i + ']');
                                            var refnum = vendorCreditUpd.getSublistValue({ sublistId: 'apply', fieldId: 'refnum', line: i });
                                            var trantype = vendorCreditUpd.getSublistValue({ sublistId: 'apply', fieldId: 'trantype', line: i });
                                            var isApplied = vendorCreditUpd.getSublistValue({ sublistId: 'apply', fieldId: 'apply', line: i });
                                            log.debug('MSK', 'refnum=' + refnum + ', isApplied=' + isApplied);
                                            log.debug('MSK', 'refnum=' + refnum + ", trantype=" + trantype);
                                            log.debug('dataItem.refnum', dataItem.refnum);
                                            log.debug('trantype', trantype);
 
                                            if (refnum === dataItem.refnum && trantype === "VendBill") {
                                                log.debug('MSK', 'isApplied=' + isApplied);
                                                if (!isApplied) {
                                                    // Selecciona la línea antes de establecer los valores
                                                    vendorCreditUpd.selectLine({ sublistId: 'apply', line: i });
 
                                                    // Establece los valores
                                                    vendorCreditUpd.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: true });
                                                    vendorCreditUpd.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'amount', value: dataItem.retencion_item });
 
                                                    // Guarda la línea modificada
                                                    vendorCreditUpd.commitLine({ sublistId: 'apply' });
 
                                                    log.debug('MSK', 'Aplicar a ' + dataItem.refnum + ", monto:" + dataItem.retencion_item);
                                                } else {
                                                    log.debug('MSK', 'La factura ya ha sido aplicada: ' + dataItem.refnum);
                                                }
                                                break;
                                            }
                                        }
                                    }
                                    contadorRef++
                                });
                               
                                var vendorCreditId = vendorCreditUpd.save();
                                log.debug('MSK', 'Documento de Retención Modificado');
 
                            } else {
                                log.debug('MSK', 'No se creará Comprobante Retencion, todas las facturas pagadas tienen detracción');
                            }
                        }else{
                            log.debug('MSK', 'No se creará Comprobante Retencion, el total de facturas involucradas no supera los 700');
                        }
 
                    } else {
                        log.debug('MSK', 'No aplica retención');
                    }
                } else {
                    log.debug('MSK', 'subsidiary == '+subsidiary+' --> No Aplica');
                }
 
            } else {
                log.debug('MSK', 'NO Entré al IF');
            }
        } catch (error) {
            log.debug('Error al crear el crédito de factura', error.message);
        }
    }
 
    return {
        //afterSubmit: afterSubmit,
        beforeSubmit: beforeSubmit
    }
});