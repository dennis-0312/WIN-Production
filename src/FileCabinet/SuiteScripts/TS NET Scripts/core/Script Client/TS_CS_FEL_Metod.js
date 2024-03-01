/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
*/
define(['N/currentRecord', 'N/search'], function (currentRecord, search) {

    const INVOICE = 'invoice';
    const CASH_SALE = 'cashsale';
    const CREDIT_MEMO = 'creditmemo';
    const VENDOR_BILL = 'vendorbill';
    const ITEM_FUL_FILLMENT = 'itemfulfillment';

    const PE_FEL_Sending_Method = 4;
    const PE_Invoice_FEL_Template = 1;
    const ITEM = 'item';
    const GASTO = 'expense';

    let typeMode = "";
    let TIPO_COMPROBANTE_FA = '' //Se consulta a la tabla customrecord_pe_fiscal_document_type

    const ID_RETENCION_DEFAULT = '23'//ASB:23, TS:, GG:23 (COMBO SUPERIOR)

    function pageInit(context) {
        typeMode = context.mode;
        var currentRecord = context.currentRecord;
        var type_transaction = currentRecord.type;
        console.log("typeMode", typeMode);
        console.log("type_transaction", type_transaction);
        try {
            if (typeMode == 'create' || typeMode == 'copy') {
                if (type_transaction == INVOICE || type_transaction == CREDIT_MEMO || type_transaction == ITEM_FUL_FILLMENT) {
                    currentRecord.setValue('custbody_psg_ei_template', PE_Invoice_FEL_Template);
                    currentRecord.setValue('custbody_psg_ei_sending_method', PE_FEL_Sending_Method);
                }
            }
            if (typeMode == 'create' || typeMode == 'copy') {
                if (type_transaction == ITEM_FUL_FILLMENT) {
                    var id_entidad = currentRecord.getValue('entity');
                    var id_location = currentRecord.getValue('custbody_pe_location_source');

                    var direcc_ubica = BuscarLoca(id_location);
                    var direcc_customer = BuscarCustomer(id_entidad);
                    if(direcc_customer.length == 0){
                        direcc_customer = BuscarVendor(id_entidad);
                    }

                    currentRecord.setValue('custbody_pe_ubigeo_punto_partida', direcc_ubica[0]);
                    currentRecord.setValue('custbody_pe_source_address', direcc_ubica[1]);
                    currentRecord.setValue('custbody_pe_ubigeo_punto_llegada', direcc_customer[0]);
                    currentRecord.setValue('custbody_pe_delivery_address', direcc_customer[1]);
                }
            }
        } catch (error) {
            console.log('error pageInit', error);
        }

        try {
            const type_transaction = currentRecord.type;

            if (typeMode == 'edit' || typeMode == 'copy'){
                if(type_transaction == INVOICE){
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

    function fieldChanged(context) {
        var currentRecord = context.currentRecord;
        var type_transaction = currentRecord.type;
        var FieldName = context.fieldId;
        try {
            if (typeMode == 'create' || typeMode == 'copy' || typeMode == 'edit') {
                if (type_transaction == ITEM_FUL_FILLMENT) {
                    if (FieldName == 'custbody_pe_location_source') {
                        var id_location = currentRecord.getValue('custbody_pe_location_source');
                        var direcc_ubica = BuscarLoca(id_location);
                        currentRecord.setValue('custbody_pe_ubigeo_punto_partida', direcc_ubica[0]);
                        currentRecord.setValue('custbody_pe_source_address', direcc_ubica[1]);
                    }
                }
            }
        } catch (error) {
            console.log('error fieldChanged', error);
        }
    }

    function BuscarLoca(id_location) {
        var locationSearchObj = search.create({
            type: "location",
            filters:
                [
                    ["internalid", "anyof", id_location]
                ],
            columns:
                [
                    search.createColumn({
                        name: "custrecord_pe_ubigeo",
                        join: "address",
                        label: "PE Ubigeo"
                    }),
                    search.createColumn({
                        name: "address",
                        join: "address",
                        label: " Dirección"
                    })
                ]
        });

        var arr = [];
        locationSearchObj.run().each(function (result) {
            var ubigeo = result.getValue(locationSearchObj.columns[0]);
            var direccion = result.getValue(locationSearchObj.columns[1]);
            arr = [ubigeo, direccion];
            return true;
        });
        return arr;
    }

    function BuscarCustomer(id_customer) {
        var customerSearchObj = search.create({
            type: "customer",
            filters:
                [
                    ["internalid", "anyof", id_customer]
                ],
            columns:
                [
                    search.createColumn({
                        name: "custrecord_pe_ubigeo",
                        join: "Address",
                        label: "PE Ubigeo"
                    }),
                    search.createColumn({
                        name: "address",
                        join: "Address",
                        label: "Dirección"
                    })
                ]
        });

        var arr = [];
        customerSearchObj.run().each(function (result) {
            var ubigeo = result.getValue(customerSearchObj.columns[0]);
            var direccion = result.getValue(customerSearchObj.columns[1]);
            arr = [ubigeo, direccion];
            return true;
        });
        return arr;
    }

    function BuscarVendor(id_customer) {
        var vendorSearchObj = search.create({
            type: "vendor",
            filters:
                [
                    ["internalid", "anyof", id_customer]
                ],
            columns:
                [
                    search.createColumn({
                        name: "custrecord_pe_ubigeo",
                        join: "Address",
                        label: "PE Ubigeo"
                    }),
                    search.createColumn({
                        name: "address",
                        join: "Address",
                        label: "Dirección"
                    })
                ]
        });

        var arr = [];
        vendorSearchObj.run().each(function (result) {
            var ubigeo = result.getValue(vendorSearchObj.columns[0]);
            var direccion = result.getValue(vendorSearchObj.columns[1]);
            arr = [ubigeo, direccion];
            return true;
        });
        return arr;
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
        fieldChanged: fieldChanged
    }
});
