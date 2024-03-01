/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 * Task          Date            Author                                         Remarks
 * 6.1           29 Ago 2023     Alexander Ruesta <aruesta@myevol.biz>          - Creación del reporte 6.1
 *
 */

define(['N/runtime', 'N/search', 'N/config', 'N/render', 'N/record', 'N/file', './PE_LIB_Libros.js', 'N/format'],  (runtime, search, config, render, record, file, libPe, format) => {

    var objContext = runtime.getCurrentScript();
    
    /** PARAMETROS */
    var pGloblas = {};

    /** REPORTE */
    var formatReport = 'pdf';
    var nameReport = '';
    var transactionFile = null;

    /** DATOS DE LA SUBSIDIARIA */
    var companyName = '';
    var companyRuc = '';
    var companyLogo = '';
    var companyDV = '';
    var hasInfo = "";
    var year = "";
    var month = "";

    var featureSTXT = null;
    var featMultibook = null;
    var featSubsidiary = null;

    const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

    const getInputData = () => {
        try{
            getParameters();

            return getTransactions();
        }catch (e){
            log.error('[ Get Input Data Error ]', e);
        }
        

    }
    
    const map = (context) => {
        try {
            var key = context.key;
            var dataMap = JSON.parse(context.value);
            /*var newResultTransactions = [
                dataMap[0],
                dataMap[1],
                dataMap[2],
                dataMap[3],
                (dataMap[4] == "- None -" ? "" : dataMap[4]),
                (dataMap[5] == "- None -" ? "" : dataMap[5]),
                dataMap[6],
                (dataMap[7] == "- None -" ? "" : dataMap[7]),
                (dataMap[8] == "- None -" ? "" : dataMap[8]),
                (dataMap[9] == "- None -" ? "" : dataMap[9]),
                dataMap[10],
                dataMap[11],
                dataMap[12],
                dataMap[13],
                (dataMap[14] == "- None -" ? "" : dataMap[14]),
                (dataMap[15] == "- None -" ? "" : dataMap[15]),
                (dataMap[16] == "- None -" ? "" : dataMap[16]),
                (dataMap[17] == "" ? 0 : dataMap[17]),
                (dataMap[18] == "" ? 0 : dataMap[18]),
                dataMap[19],
                dataMap[20],
                dataMap[23]
            ]*/
            var resultTransactions = {
                periodoContable: dataMap[0],
                cuo: dataMap[1],
                numAsiento: dataMap[2],
                codCuenta: dataMap[3],
                codOp: (dataMap[4] == "- None -" ? "" : dataMap[4]),
                ceco: (dataMap[5] == "- None -" ? "" : dataMap[5]),
                tipoMoneda: dataMap[6],
                tipoDocIdentidad: (dataMap[7] == "- None -" ? "" : dataMap[7]),
                numDocIdentidad: (dataMap[8] == "- None -" ? "" : dataMap[8]),
                tipoComprob: (dataMap[9] == "- None -" ? "" : dataMap[9]),
                serieComprob: dataMap[10],
                comprobPago: dataMap[11],
                fecha: dataMap[12],
                dueDate: dataMap[13],
                fechaOp: (dataMap[14] == "- None -" ? "" : dataMap[14]),
                glosaDesc: (dataMap[15] == "- None -" ? "" : dataMap[15]),
                glosaRef: (dataMap[16] == "- None -" ? "" : dataMap[16]),
                movDebe: (dataMap[17] == "" ? 0 : dataMap[17]),
                movHaber: (dataMap[18] == "" ? 0 : dataMap[18]),
                codLibro: dataMap[19],
                codLibro2: dataMap[20],
                estadoOp: dataMap[23]
            };
            context.write({ key: key, value: resultTransactions });
            //context.write({ key: key, value: newResultTransactions });
        } catch (e) {
            log.error('[ Map Error ]', e);
        }
    }

    const getPeriod = () => {
        var periodRecord = search.lookupFields({
            type: "accountingperiod",
            id: pGloblas.pPeriod,
            columns: ["startdate"]
        });
        var firstDate = format.parse({
            value: periodRecord.startdate,
            type: format.Type.DATE
        });
        month = firstDate.getMonth() + 1;
        month = month < 10 ? `0${month}` : month;
        year = firstDate.getFullYear();
    }

    const summarize = (context) => {
        log.debug('Entro al summarize');
        getParameters();
        getSubdiary();
        getPeriod();
        pGloblas['pRecordID'] = libPe.createLog(pGloblas.pSubsidiary, pGloblas.pPeriod, "Libro Mayor 6.1")
        var transactionJSON = {};
        transactionJSON["parametros"] = pGloblas
        transactionJSON["transactions"] = [];
        hasInfo = 0;
        context.output.iterator().each(function (key, value) {
            hasInfo = 1;
            value = JSON.parse(value);
            log.error('value',value);
            transactionJSON["transactions"].push(value);
            return true;
        });
        log.debug('transactionJSON', transactionJSON["transactions"]);
      var jsonAxiliar = getJsonData(transactionJSON["transactions"]);
      if (!isObjEmpty(transactionJSON["transactions"])) {      
            var renderer = render.create();
            renderer.templateContent = getTemplate();
            renderer.addCustomDataSource({
                format: render.DataSource.OBJECT,
                alias: "input",
                data: {
                    data: JSON.stringify(jsonAxiliar)
                }
            });
            stringXML = renderer.renderAsPdf();
            saveFile(stringXML);
            log.debug('Termino');
            return true;

        } else {
            log.debug('ERROR','No data');
            libPe.noData(pGloblas.pRecordID);
        }
    }

    const getJsonData = (transactions) => {
        var cantidadtotal = 0;
        let userTemp = runtime.getCurrentUser(),
            useID = userTemp.id,
            jsonTransacion = {},
            movDebe = 0,
            movHaber = 0;

        var employeeName = search.lookupFields({
            type: search.Type.EMPLOYEE,
            id: useID,
            columns: ['firstname', 'lastname']
        });

        for (let k in transactions) {
            let dato_movDebe = parseFloat(transactions[k].movDebe);
            let dato_movHaber = parseFloat(transactions[k].movHaber);
            cantidadtotal = cantidadtotal + 1;
            //let IDD = transactions[k].cuo;
            let IDD = k;
            jsonTransacion[IDD] = {
                periodoContable: transactions[k].periodoContable,
                cuo: transactions[k].cuo,
                numAsiento: transactions[k].numAsiento,
                codCuenta: transactions[k].codCuenta,
                codOp: transactions[k].codOp,
                ceco: transactions[k].ceco,
                tipoMoneda: transactions[k].tipoMoneda,
                tipoDocIdentidad: transactions[k].tipoDocIdentidad,
                numDocIdentidad: transactions[k].numDocIdentidad,
                tipoComprob: transactions[k].tipoComprob,
                serieComprob: transactions[k].serieComprob,
                comprobPago: transactions[k].comprobPago,
                fecha: transactions[k].fecha,
                dueDate: transactions[k].dueDate,
                fechaOp: transactions[k].fechaOp,
                glosaDesc: transactions[k].glosaDesc,
                glosaRef: transactions[k].glosaRef,
                movDebe: numberWithCommas(roundTwoDecimals(Number(transactions[k].movDebe)).toFixed(2)),
                movHaber: numberWithCommas(roundTwoDecimals(Number(transactions[k].movHaber)).toFixed(2)),
                codLibro: transactions[k].codLibro,
                codLibro2: transactions[k].codLibro2,
                estadoOp: transactions[k].estadoOp
            }
            movDebe += dato_movDebe;
            movHaber += dato_movHaber;
        }

        let periodSearch = search.lookupFields({
            type: search.Type.ACCOUNTING_PERIOD,
            id: pGloblas.pPeriod,
            columns: ['periodname', "startdate"]
        });
        let monthName = months[Number(periodSearch.startdate.split("/")[1]) - 1];
        let year = periodSearch.startdate.split("/")[2];
        movDebe = parseFloat(movDebe)
        movHaber = parseFloat(movHaber)

        log.error('cantidadtotal',cantidadtotal);
        
        var jsonAxiliar = {
            "company": {
                "firtsTitle": 'FORMATO 6.1: INVT. PERMANENTE',
                "secondTitle": monthName.toLocaleUpperCase() + ' ' + year,
                "thirdTitle": companyRuc.replace(/&/g, '&amp;'),
                "fourthTitle": companyName.replace(/&/g, '&amp;').toLocaleUpperCase(),
                "cantidadtotal": cantidadtotal,
            },
            "total": {
                "movDebe": movDebe,
                "movHaber": movHaber,
            },
            "movements": jsonTransacion
        };
        return jsonAxiliar;
    }

    const getFileName = () => {
        return `LE${companyRuc}${year}${month}00060100001${hasInfo}11_${pGloblas.pRecordID}.pdf`;
    }

    const saveFile = (stringValue) => {
        var fileAuxliar = stringValue;
        var urlfile = '';

        nameReport = getFileName();

        var folderID = libPe.callFolder();

        fileAuxliar.name = nameReport;
        fileAuxliar.folder = folderID;

        var fileID = fileAuxliar.save();

        let auxFile = file.load({ id: fileID });
        urlfile += auxFile.url;
        libPe.loadLog(pGloblas.pRecordID, nameReport, urlfile)

    }

    const getTemplate = () => {
        var aux = file.load("./Template/PE_Template6_1LibMay.ftl");
        return aux.getContents();
    }

    const getTransactions = () => {
        var arrResult = [];
        var _cont = 0;

        // PE - Libro Diario 6.1
        var savedSearch = search.load({ id: 'customsearch_pe_libro_mayor_6_1' });

        if (featSubsidiary) {
            savedSearch.filters.push(search.createFilter({
                name: 'subsidiary',
                operator: search.Operator.IS,
                values: pGloblas.pSubsidiary
            }));
        }

        savedSearch.filters.push(search.createFilter({
            name: 'postingperiod',
            operator: search.Operator.IS,
            values: [pGloblas.pPeriod]
        }));

        let searchResultCount = savedSearch.runPaged().count;
        var pagedData = savedSearch.runPaged({ pageSize: 1000 });
        var page, columns;
        pagedData.pageRanges.forEach(function (pageRange) {
            page = pagedData.fetch({ index: pageRange.index });
            page.data.forEach((result) => {
                columns = result.columns;
                arrAux = new Array();
                let arreglo = new Array();

                // 1. PERÍODO
                arrAux[0] = result.getValue(columns[0]);

                // 2. CUO
                arrAux[1] = result.getValue(columns[1]);

                // 3. NÚMERO CORRELATIVO DEL ASIENTO
                arrAux[2] = result.getValue(columns[2]);

                // 4. CÓDIGO DE LA CUENTA CONTABLE
                arrAux[3] = result.getValue(columns[3]);

                // 5. CÓDIGO DE UNIDAD DE OPERACIÓN
                arrAux[4] = result.getValue(columns[4]);

                // 6. CENTRO DE COSTO
                arrAux[5] = result.getValue(columns[5]);

                // 7. TIPO DE MONEDA DE ORIGEN
                arrAux[6] = result.getValue(columns[6]);

                // 8. TIPO DE DOCUMENTO DE IDENTIDAD DEL EMISOR
                arrAux[7] = result.getValue(columns[7]);

                // 9. NÚMERO DE DOCUMENTO DE IDENTIDAD DEL EMISOR
                arrAux[8] = result.getValue(columns[8]);

                // 10.TIPO DE COMPROBANTE
                arrAux[9] = result.getValue(columns[9]);

                // 11. NÚMERO DE SERIE DEL COMPROBANTE DE PAGO
                arrAux[10] = result.getValue(columns[10]);

                // 12. NÚMERO DE COMPRONBANTE DE PAGO
                arrAux[11] = result.getValue(columns[11]);

                // 13. FECHA CONTABLE
                arrAux[12] = result.getValue(columns[12]);

                // 14. FECHA DE VENCIMIENTO
                arrAux[13] = result.getValue(columns[13]);

                // 15. FECHA DE LA OPERACIÓN O EMISIÓN
                arrAux[14] = result.getValue(columns[14]);

                // 16. GLOSA O DESCRIPCIÓN DE LA NATURALEZA DE LA OPERACIÓN REGISTRADA DE SER EL CASO
                arrAux[15] = result.getValue(columns[15]);

                // 17. GLOSA REFERENCIAL
                arrAux[16] = result.getValue(columns[16]);

                // 18. MOVIMIENTOS DEL DEBE
                arrAux[17] = result.getValue(columns[17]);

                // 19. MOVIMIENTO DEL HABER
                arrAux[18] = result.getValue(columns[18]);

                // 20.  COD LIBRO
                arrAux[19] = result.getValue(columns[19]);

                // 20.1 CAMPO 1 ==== 21
                arrAux[20] = result.getValue(columns[20]);

                // 20.2 CAMPO 2
                arrAux[21] = result.getValue(columns[21]);

                // 20.3 CAMPO 3
                arrAux[22] = result.getValue(columns[22]);

                if (arrAux[20] != '' && arrAux[21] != '' && arrAux[22] != '') {
                    arreglo.push(arrAux[20], arrAux[21], arrAux[22]);
                    for (let i = 0; i < arreglo.length; i++) {
                        if ((i + 1) != arreglo.length) {
                            arrAux[20] += arreglo[i] + '&amp;';
                        } else {
                            arrAux[20] += arreglo[i]
                        }
                    }
                } else {
                    arrAux[20] = '';
                }

                // 22 INDICA EL ESTADO DE LA OPERACIÓN
                arrAux[23] = result.getValue(columns[23]);
                //log.error('arrAux',arrAux)
                arrResult.push(arrAux);
            });
        });

        //arrResult = ordenarCuenta(arrResult);
        //log.error('arrResult',arrResult)

        return arrResult;
    }

    const getSubdiary = () => {
        
        if (featSubsidiary) {
            var dataSubsidiary = record.load({
                type: 'subsidiary',
                id: pGloblas.pSubsidiary
            });
            companyName = dataSubsidiary.getValue('legalname');
            companyRuc = dataSubsidiary.getValue('federalidnumber');
        } else {
            companyName = config.getFieldValue('legalname');
            companyRuc = ''
        }
    }

    const getParameters = () => {
       pGloblas = objContext.getParameter('custscript_pe_61libromayor_params'); // || {};
        pGloblas = JSON.parse(pGloblas);
        /*pGloblas = {
            recordID: '',
            reportID: 19,
            subsidiary: 3,
            periodCon: 111
        }*/
    // log.debug('previo', pGloblas)

        pGloblas = {
            pRecordID: pGloblas.recordID,
            pFeature: pGloblas.reportID,
            pSubsidiary: pGloblas.subsidiary,
            pPeriod: pGloblas.periodCon,
        }
        //log.debug('XDDD', pGloblas);
        featSubsidiary = runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" });
    }

    const isObjEmpty = (obj) => {
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop)) return false;
        }
        return true;
    }

    const numberWithCommas = (x) => {
        x = x.toString();
        var pattern = /(-?\d+)(\d{3})/;
        while (pattern.test(x))
            x = x.replace(pattern, "$1,$2");
        return x;
    }
    
    const roundTwoDecimals = (value) => {
        return Math.round(value * 100) / 100;
    }

    const ordenarCuenta = (array) => {
        for (let i = 0; i < array.length ; i++){

            for (let j = i+1; j < array.length ; j++){

                var valor = Number(array[i][3]);
                var nuevoValor = Number(array[j][3]);

                if(valor > nuevoValor){
                    var antearray = array[i];
                    var nuevoarray = array[j];

                    array[i] = nuevoarray;
                    array[j] = antearray;
                }
            }
        }
        return array;
    }

    return {
        getInputData: getInputData,
        map: map,
        // reduce: reduce,
        summarize: summarize
    };

});