/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define([
    'N/record',
    'N/log',
    'N/runtime',
    'N/search',
    '../Library/WN_CM_Library'
], function (record, log, runtime, search, _library) {
    function beforeLoad(context) {
        if (context.type == context.UserEventType.CREATE) {
            var suma = _library.myFunction(20, 40);
            log.debug('Suma', suma);
        }
    }

    function beforeSubmit(context) {
        if (context.type == context.UserEventType.CREATE) {
            var objRecord = context.newRecord;
            var userObj = runtime.getCurrentUser();
            var fieldLookUp = search.lookupFields({
                type: search.Type.EMPLOYEE,
                id: userObj.id,
                columns: ['department', 'class', 'location']
            });
            var centroCosto = fieldLookUp.department[0].value;
            var clase = fieldLookUp.class[0].value;
            var ubicacion = fieldLookUp.location[0].value;
            objRecord.setValue('department', centroCosto);
            objRecord.setValue('class', clase);
            objRecord.setValue('location', ubicacion);
        }
    }

    function afterSubmit(context) {
        var objRecord = context.newRecord;
        var salesorder = record.load({ type: record.Type.SALES_ORDER, id: objRecord.id });
        var centroCosto = salesorder.getValue({ fieldId: 'department' });
        var clase = salesorder.getValue({ fieldId: 'class' });
        var ubicacion = salesorder.getValue({ fieldId: 'location' });
        var payment = salesorder.getValue({ fieldId: 'total' });
        var deposit = record.create({
            type: record.Type.CUSTOMER_DEPOSIT,
            isDynamic: true,
            defaultValues: {
                salesorder: objRecord.id
            }
        });
        deposit.setValue({ fieldId: 'payment', value: payment });
        deposit.setValue('department', centroCosto);
        deposit.setValue('class', clase);
        deposit.setValue('location', ubicacion);

        var deposito = deposit.save();
        log.debug('Result', deposito);
    }

    return {
        beforeLoad: beforeLoad,
        //beforeSubmit: beforeSubmit,
        //afterSubmit: afterSubmit
    };
});