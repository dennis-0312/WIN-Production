/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 */
define(['N/file', 'N/log', 'N/email', 'N/runtime', 'N/search'], function (file, log, email, runtime, search) {
    function execute(context) {
        var array = new Array();
        var busquedaOrdenVenta = search.load({ id: 'customsearch_wn_busqueda_orden_venta' });
        busquedaOrdenVenta.run().each(function (result) {
            var numeroDcoumento = result.getValue({ name: 'tranid' });
            var estado = result.getValue({ name: 'statusref' });
            array.push({
                numeroDcoumento: numeroDcoumento,
                estado: estado
            })
            return true;
        });
        log.debug('Response', array);
    }

    return {
        execute: execute
    };
});