/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/log', 'N/record', 'N/search'],
    /**
 * @param{log} log
 * @param{record} record
 * @param{search} search
 */
    (log, record, search) => {

        /**
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */
        const execute = (scriptContext) => {
            var purchaseorderSearchObj = search.create({
                type: "purchaseorder",
                filters:
                    [
                        ["type", "anyof", "PurchOrd"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "internalid",
                            summary: "GROUP",
                            sort: search.Sort.DESC,
                            label: "ID interno"
                        })
                    ]
            });
            var searchResultCount = purchaseorderSearchObj.runPaged().count;
            log.debug("purchaseorderSearchObj result count", searchResultCount);
            const purchaseOrderSearchPagedData = purchaseorderSearchObj.runPaged({ pageSize: 1000 });
            for (let i = 0; i < purchaseOrderSearchPagedData.pageRanges.length; i++) {
                const purchaseOrderSearchPage = purchaseOrderSearchPagedData.fetch({ index: i });
                purchaseOrderSearchPage.data.forEach(result => {
                    try {
                        const internalId = result.getValue({ name: 'internalid', summary: search.Summary.GROUP })
                        record.delete({ type: 'purchaseorder', id: internalId });
                        log.debug('Orden', 'Orden ' + internalId + ' eliminada');
                    } catch (error) {
                        log.error('Error', error);
                    }
                });
            }
        }

        return { execute }

    });
