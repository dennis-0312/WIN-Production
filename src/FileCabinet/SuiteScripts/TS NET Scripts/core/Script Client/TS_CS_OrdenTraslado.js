/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
 define(['N/currentRecord', 'N/url', 'N/search',"N/record"], function(currentRecord, url, search,record) {

    let typeMode = "";
    function pageInit(context) {
        typeMode = context.mode;
        
    }

    function fieldChanged(context){
        let currentRecord = context.currentRecord;
        var FieldName = context.fieldId;

        if(typeMode=="copy" || typeMode=="create"){

            if(FieldName == 'location'){
                let dirOrigen = currentRecord.getValue('location');
                if(dirOrigen != '' && dirOrigen != null){
                    var direcc_ubica = BuscarLoca(dirOrigen);
                    currentRecord.setValue('custbody_pe_ubigeo_punto_partida', direcc_ubica[0]);
                    currentRecord.setValue('custbody_pe_source_address', direcc_ubica[1]);
                }
            }

            if(FieldName == 'transferlocation'){
                let dirDestino = currentRecord.getValue('transferlocation');
                if(dirDestino != '' && dirDestino != null){
                    var direcc_ubica = BuscarLoca(dirDestino);
                    currentRecord.setValue('custbody_pe_ubigeo_punto_llegada', direcc_ubica[0]);
                    currentRecord.setValue('custbody_pe_delivery_address', direcc_ubica[1]);
                }
            }

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

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged
    }
});