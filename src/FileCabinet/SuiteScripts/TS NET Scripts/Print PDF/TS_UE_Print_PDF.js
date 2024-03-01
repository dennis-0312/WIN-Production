/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define([],

    function () {

        function beforeLoad(scriptContext) {
            try {
                var form = scriptContext.form;
                var currentRecord = scriptContext.newRecord;
                var type_event = scriptContext.type;

                if (type_event == scriptContext.UserEventType.VIEW) {
                    if (currentRecord.type == 'itemfulfillment') {
                        var btn_name = 'Imprimir';
                        form.addButton({
                            id: 'custpage_ts_print_pdf',
                            label: btn_name,
                            functionName: 'printPdf(' + currentRecord.id + ',"' + currentRecord.type + '", false)'
                        });
                        form.clientScriptModulePath = './TS_CS_Print_PDF.js';
                    }

                }

            } catch (err) {
                log.error("Error", "[ beforeLoad ] " + err);
            }

        }


        function beforeSubmit(scriptContext) {

        }

        function afterSubmit(scriptContext) {

        }

        return {
            beforeLoad: beforeLoad,
            //beforeSubmit: beforeSubmit,
            //afterSubmit: afterSubmit
        };

    });