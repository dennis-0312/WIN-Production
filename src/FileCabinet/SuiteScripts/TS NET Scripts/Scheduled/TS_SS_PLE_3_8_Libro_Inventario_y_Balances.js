/**
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/runtime', 'N/log', 'N/file', 'N/task', "N/config","N/format"], (search, record, runtime, log, file, task, config,format) => {
    // Schedule Report: PE - Anual: Inv. Balance - Detalle 30 - 3.8
    const execute = (context) => {
        try {
            const featureSubsidiary = runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });
            const searchId = 'customsearch_pe_detalle_30_3_8'; //
            var logrecodId = 'customrecord_pe_generation_logs';
            let fedIdNumb = '';
            let hasinfo = 0;

            const params = getParams();

            if (featureSubsidiary) {
                const getruc = getRUC(params.filterSubsidiary)
                fedIdNumb = getruc;
            } else {
                const employerid = getEmployerID();
                fedIdNumb = employerid;
            }

            var createrecord = createRecord(logrecodId, featureSubsidiary, params.filterSubsidiary, params.filterPostingPeriod);
            const searchbook = searchBook(params.filterSubsidiary, params.filterPostingPeriod, searchId, featureSubsidiary, params.filterAnioPeriod);

            if (searchbook.thereisinfo == 1) {
                hasinfo = '1';
                const structuregbody = structureBody(searchbook.content);
                const createfile = createFile(params.filterPostingPeriod, fedIdNumb, hasinfo, createrecord.recordlogid, params.filterFormat, structuregbody, params.fileCabinetId, params.filterAnioPeriod);
                const statusProcess = setRecord(createrecord.irecord, createrecord.recordlogid, createfile, logrecodId);
                log.debug({ title: 'FinalResponse', details: 'Estado del proceso: ' + statusProcess + ' OK!!' });
            } else {
                setVoid(createrecord.irecord, logrecodId, createrecord.recordlogid);
                log.debug({ title: 'FinalResponse', details: 'No hay registros para la solicitud: ' + createrecord.recordlogid });
            }
        } catch (e) {
            log.error({ title: 'ErrorInExecute', details: e });
            setError(createrecord.irecord, logrecodId, createrecord.recordlogid, e)
        }
    }


    const getParams = () => {
        try {
            const scriptObj = runtime.getCurrentScript();
            const filterSubsidiary = scriptObj.getParameter({ name: 'custscript_ts_ss_ple_3_8_invbal_sub' });
            const filterPostingPeriod = scriptObj.getParameter({ name: 'custscript_ts_ss_ple_3_8_invbal_per' });
            const filterFormat = scriptObj.getParameter({ name: 'custscript_ts_ss_ple_3_8_invbal_for' });
            const fileCabinetId = scriptObj.getParameter({ name: 'custscript_ts_ss_ple_3_8_invbal_fol' });
            const filterAnioPeriod = scriptObj.getParameter({ name: 'custscript_ts_ss_ple_3_8_invbal_year' });
            return {
                filterSubsidiary: filterSubsidiary,
                filterPostingPeriod: filterPostingPeriod,
                filterFormat: filterFormat,
                fileCabinetId: fileCabinetId,
                filterAnioPeriod: filterAnioPeriod
            }
        } catch (e) {
            log.error({ title: 'getParams', details: e });
        }
    }


    const getRUC = (filterSubsidiary) => {
        try {
            const subLookup = search.lookupFields({
                type: search.Type.SUBSIDIARY,
                id: filterSubsidiary,
                columns: ['taxidnum']
            });
            const ruc = subLookup.taxidnum;
            return ruc;
        } catch (e) {
            log.error({ title: 'getRUC', details: e });
        }
    }


    const getEmployerID = () => {
        const configpage = config.load({ type: config.Type.COMPANY_INFORMATION });
        const employeeid = configpage.getValue('employerid');
        return employeeid;
    }

    const getPeriodId = () => {
        let startDate = new Date();
        let firstDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        firstDate = format.format({
            value: firstDate,
            type: format.Type.DATE
        });
        let resultSearch = search.create({
            type: "accountingperiod",
            filters: [
                ["isadjust", "is", "F"],
                "AND",
                ["isquarter", "is", "F"],
                "AND",
                ["isyear", "is", "F"],
                "AND",
                ["startdate", "on", firstDate]
            ],
            columns: [
                search.createColumn({
                    name: "internalid"
                })
            ]
        }).run().getRange(0, 1);
        if (resultSearch.length) return resultSearch[0].id;
        return "";
    }

    const createRecord = (logrecodId, featureSubsidiary, filterSubsidiary, filterPostingPeriod) => {
        try {
            const recordlog = record.create({ type: logrecodId });
            if (featureSubsidiary) {
                recordlog.setValue({ fieldId: 'custrecord_pe_subsidiary_log', value: filterSubsidiary });
            }
            var periodId = getPeriodId(filterPostingPeriod);
            recordlog.setValue({ fieldId: 'custrecord_pe_period_log', value: periodId });
            recordlog.setValue({ fieldId: 'custrecord_pe_status_log', value: "Procesando..." });
            recordlog.setValue({ fieldId: 'custrecord_pe_report_log', value: "Procesando..." });
            recordlog.setValue({ fieldId: 'custrecord_pe_book_log', value: 'Inventario y Balance 3.8' });
            const recordlogid = recordlog.save();

            return { recordlogid: recordlogid, irecord: record };
        } catch (e) {
            log.error({ title: 'createRecord', details: e });
        }
    }


    const searchBook = (subsidiary, period, searchId, featureSubsidiary, anioperiod) => {
        let json = new Array();
        var searchResult;
        let division = 0.0;
        let laps = 0.0;
        let start = 0;
        let end = 1000;
        try {

            const searchLoad = search.load({
                id: searchId
            });

            let filters = searchLoad.filters;

            // const filterOne = search.createFilter({
            //     name: 'postingperiod',
            //     operator: search.Operator.ANYOF,
            //     values: period
            // });

            // filters.push(filterOne);

            if (featureSubsidiary) {
                const filterTwo = search.createFilter({
                    name: 'subsidiary',
                    operator: search.Operator.ANYOF,
                    values: subsidiary
                });
                filters.push(filterTwo);
            }

            const searchResultCount = searchLoad.runPaged().count;


            if (searchResultCount != 0) {
                if (searchResultCount <= 4000) {
                    searchLoad.run().each((result) => {

                        let column01 = result.getValue(searchLoad.columns[0]);
                        let column02 = result.getValue(searchLoad.columns[1]);
                        let column03 = result.getValue(searchLoad.columns[2]);
                        let column04 = result.getValue(searchLoad.columns[3]);
                        let column05 = result.getValue(searchLoad.columns[4]);
                        let column06 = result.getValue(searchLoad.columns[5]);
                        let column07 = result.getValue(searchLoad.columns[6]);
                        if (column07 == '- None -') {
                            column07 = ''
                        }
                        let column08 = result.getValue(searchLoad.columns[7]);
                        if (column08 == '- None -') {
                            column08 = ''
                        }
                        column08 = parseFloat(column08).toFixed(2);
                        let column09 = result.getValue(searchLoad.columns[8]);
                        if (column09 == '- None -') {
                            column09 = ''
                        }
                        let column10 = result.getValue(searchLoad.columns[9]);
                        if (column10 == '- None -') {
                            column10 = ''
                        }
                        column10 = parseFloat(column10).toFixed(2);
                        let column11 = result.getValue(searchLoad.columns[10]);
                        if (column11 == '- None -') {
                            column11 = ''
                        }
                        column11 = parseFloat(column11).toFixed(2);
                        let column12 = result.getValue(searchLoad.columns[11]);

                        let column13 = result.getValue(searchLoad.columns[12]);
                        let column14 = result.getValue(searchLoad.columns[13]);
                        let column15 = result.getValue(searchLoad.columns[14]);
                        let column16 = result.getValue(searchLoad.columns[15]);

                        let nombre = column16;
                        let numTrabajador = column13;
                        let codigoTipoDocumento = '0';

                        if(column15 != '0'){
                            let entidad = getCustomer(column15);
                            if (entidad[0] == null) {
                                entidad = getProveedor(column15);
                            }
                            if (entidad[0] == null) {
                                entidad = getemployee(column15);
                            }

                            let company = entidad[0];
                            numTrabajador = entidad[1];
                            let isPerson = entidad[2];
                            let altname = entidad[3];
                            codigoTipoDocumento = entidad[4];

                            if (company == null) company = '';
                            if (numTrabajador == null) numTrabajador = '';
                            if (isPerson == null) isPerson = '';
                            if (altname == null) altname = '';
                            if (codigoTipoDocumento == null) codigoTipoDocumento = '';

                            if (isPerson == false) {
                                nombre = company;
                            } else if (isPerson == true) {
                                nombre = altname;
                            }
                        }

                        nombre = nombre.replace(/(\r\n|\n|\r)/gm, "");
                        nombre = nombre.replace(/[\/\\|]/g, "");

                        if (column14 == anioperiod) {
                            json.push({
                                c1_periodo: column01,
                                c2_cuo: column02,
                                c3_correlativo: column03,
                                c4_tipo_doc_emisor: codigoTipoDocumento,
                                c5_nro_doc_emisor: numTrabajador,
                                c6_nombres_o_razon_social: nombre,
                                c7_codigo_titulo: column07,
                                c8_valor_unit_titulo: column08,
                                c9_cantidad_titulo: column09,
                                c10_costo_total_titulo: column10,
                                c11_provision_total: column11,
                                c12_estado_op: column12,
                            });
                        }
                        return true;
                    });
                    if(json.length > 0){
                        return { thereisinfo: 1, content: json };
                    } else {
                        return { thereisinfo: 0 }
                    }
                } else {
                    division = searchResultCount / 1000;
                    laps = Math.round(division);
                    if (division > laps) {
                        laps = laps + 1
                    }
                    for (let i = 1; i <= laps; i++) {
                        if (i != laps) {
                            searchResult = searchLoad.run().getRange({ start: start, end: end });
                        } else {
                            searchResult = searchLoad.run().getRange({ start: start, end: searchResultCount });
                        }
                        for (let j in searchResult) {
                            let column01 = searchResult[j].getValue(searchLoad.columns[0]);
                            let column02 = searchResult[j].getValue(searchLoad.columns[1]);
                            let column03 = searchResult[j].getValue(searchLoad.columns[2]);
                            let column04 = searchResult[j].getValue(searchLoad.columns[3]);
                            let column05 = searchResult[j].getValue(searchLoad.columns[4]);
                            let column06 = searchResult[j].getValue(searchLoad.columns[5]);
                            let column07 = searchResult[j].getValue(searchLoad.columns[6]);
                            if (column07 == '- None -') {
                                column07 = ''
                            }
                            let column08 = searchResult[j].getValue(searchLoad.columns[7]);
                            if (column08 == '- None -') {
                                column08 = ''
                            }
                            column08 = parseFloat(column08).toFixed(2);
                            let column09 = searchResult[j].getValue(searchLoad.columns[8]);
                            if (column09 == '- None -') {
                                column09 = ''
                            }
                            let column10 = searchResult[j].getValue(searchLoad.columns[9]);
                            if (column10 == '- None -') {
                                column10 = ''
                            }
                            column10 = parseFloat(column10).toFixed(2);
                            let column11 = searchResult[j].getValue(searchLoad.columns[10]);
                            if (column11 == '- None -') {
                                column11 = ''
                            }
                            column11 = parseFloat(column11).toFixed(2);

                            let column12 = searchResult[j].getValue(searchLoad.columns[11]);
                            let column13 = searchResult[j].getValue(searchLoad.columns[12]);
                            let column14 = searchResult[j].getValue(searchLoad.columns[13]);
                            let column15 = searchResult[j].getValue(searchLoad.columns[14]);
                            let column16 = searchResult[j].getValue(searchLoad.columns[15]);

                            let nombre = column16;
                            let numTrabajador = column13;
                            let codigoTipoDocumento = '0';
    
                            if(column15 != '0'){
                                let entidad = getCustomer(column15);
                                if (entidad[0] == null) {
                                    entidad = getProveedor(column15);
                                }
                                if (entidad[0] == null) {
                                    entidad = getemployee(column15);
                                }
    
                                let company = entidad[0];
                                numTrabajador = entidad[1];
                                let isPerson = entidad[2];
                                let altname = entidad[3];
                                codigoTipoDocumento = entidad[4];
    
                                if (company == null) company = '';
                                if (numTrabajador == null) numTrabajador = '';
                                if (isPerson == null) isPerson = '';
                                if (altname == null) altname = '';
                                if (codigoTipoDocumento == null) codigoTipoDocumento = '';
    
                                if (isPerson == false) {
                                    nombre = company;
                                } else if (isPerson == true) {
                                    nombre = altname;
                                }
                            }
    
                            nombre = nombre.replace(/(\r\n|\n|\r)/gm, "");
                            nombre = nombre.replace(/[\/\\|]/g, "");

                            if (column14 == anioperiod) {
                                json.push({
                                    c1_periodo: column01,
                                    c2_cuo: column02,
                                    c3_correlativo: column03,
                                    c4_tipo_doc_emisor: codigoTipoDocumento,
                                    c5_nro_doc_emisor: numTrabajador,
                                    c6_nombres_o_razon_social: nombre,
                                    c7_codigo_titulo: column07,
                                    c8_valor_unit_titulo: column08,
                                    c9_cantidad_titulo: column09,
                                    c10_costo_total_titulo: column10,
                                    c11_provision_total: column11,
                                    c12_estado_op: column12,
                                });
                            }
                        }
                        start = start + 1000;
                        end = end + 1000;
                    }
                    if(json.length > 0){
                        return { thereisinfo: 1, content: json };
                    } else {
                        return { thereisinfo: 0 }
                    }
                }
            }
            else {
                return { thereisinfo: 0 }
            }
        } catch (e) {
            log.error({ title: 'searchBook', details: e });
        }
    }


    const structureBody = (searchResult) => {
        let contentReport = '';
        try {
            for (let i in searchResult) {
                contentReport =
                    contentReport + searchResult[i].c1_periodo + '|' + searchResult[i].c2_cuo + '|' + searchResult[i].c3_correlativo + '|' +
                    searchResult[i].c4_tipo_doc_emisor + '|' + searchResult[i].c5_nro_doc_emisor + '|' + searchResult[i].c6_nombres_o_razon_social + '|' +
                    searchResult[i].c7_codigo_titulo + '|' + searchResult[i].c8_valor_unit_titulo + '|' + searchResult[i].c9_cantidad_titulo + '|' +
                    searchResult[i].c10_costo_total_titulo + '|' + searchResult[i].c11_provision_total + '|' + searchResult[i].c12_estado_op + '|\n';
            }

            return contentReport;
        } catch (e) {
            log.error({ title: 'structureBody', details: e });
        }
    }


    const createFile = (filterPostingPeriod, fedIdNumb, hasinfo, recordlogid, filterFormat, structuregbody, fileCabinetId, filterAnioPeriod) => {
        let typeformat;
        const header = '1 Periodo|2 CUO|3 Correlativo|4 Tipo de Documento de Identidad del emisor|5 Número de Documento de Identidad del emisor|6 Apellidos y Nombres, Denominación o Razón Social del emisor|' +
            '7 Codigo de Titulo|8 Valor nominal Unitario del Titulo|9 Cantidad de Titulos|10 Costo Total|11 Provision Total|12 Indica el estado de la operación|\n';
        try {

            let periodname = filterAnioPeriod;
            let nameReportGenerated = 'LE' + fedIdNumb + periodname + '1231030800' + '07' + '1' + hasinfo + '11_' + recordlogid;
            if (filterFormat == 'CSV') {
                nameReportGenerated = nameReportGenerated + '.csv';
                structuregbody = header + structuregbody;
                structuregbody = structuregbody.replace(/[,]/gi, ' ');
                structuregbody = structuregbody.replace(/[|]/gi, ',');
                typeformat = file.Type.CSV;
            } else {
                nameReportGenerated = nameReportGenerated + '.txt';
                typeformat = file.Type.PLAINTEXT;
            }
            const fileObj = file.create({
                name: nameReportGenerated,
                fileType: typeformat,
                contents: structuregbody,
                encoding: file.Encoding.UTF8,
                folder: fileCabinetId,
                isOnline: true
            });
            const fileId = fileObj.save();
            return fileId;
        } catch (e) {
            log.error({ title: 'createFile', details: e });
        }
    }


    const setRecord = (irecord, recordlogid, fileid, logrecodId) => {
        try {
            const fileAux = file.load({ id: fileid });
            irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_file_cabinet_log: fileAux.url } });
            irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_status_log: 'Generated' } });
            irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_report_log: fileAux.name } });
            return recordlogid;
        } catch (e) {
            log.error({ title: 'setRecord', details: e });
        }
    }


    const setError = (irecord, logrecodId, recordlogid, error) => {
        try {
            irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_status_log: 'ERROR: ' + error } });
        } catch (e) {
            log.error({ title: 'setError', details: e });
        }
    }


    const setVoid = (irecord, logrecodId, recordlogid, estado) => {
        try {
            const estado = 'No hay registros';
            const report = 'Proceso finalizado';
            irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_status_log: estado } });
            irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_report_log: report } });
        } catch (e) {
            log.error({ title: 'setVoid', details: e });
        }
    }

    const getProveedor = (id) => {
        id = Number(id);
        try {
            var arr = [];
            let vendor = search.lookupFields({
                type: "vendor",
                id: id,
                columns: [
                    "companyname", 'vatregnumber', 'isperson', 'altname', 'custentity_pe_code_document_type',
                ]
            });
            arr[0] = vendor.companyname;
            arr[1] = vendor.vatregnumber;
            arr[2] = vendor.isperson;
            arr[3] = vendor.altname;
            arr[4] = vendor.custentity_pe_code_document_type;
            return arr;
        } catch (error) {
            log.error('error-getProveedor', error);
        }
    }

    const getCustomer = (id) => {
        id = Number(id);
        try {
            var arr = [];
            let customer = search.lookupFields({
                type: "customer",
                id: id,
                columns: [
                    "companyname", 'vatregnumber', 'isperson', 'altname', 'custentity_pe_code_document_type'
                ]
            });
            arr[0] = customer.companyname;
            arr[1] = customer.vatregnumber;
            arr[2] = customer.isperson;
            arr[3] = customer.altname;
            arr[4] = customer.custentity_pe_code_document_type;
            return arr;
        } catch (error) {
            log.error('error-getCustomer', error);
        }
    }

    const getemployee = (id) => {
        id = Number(id);
        try {
            var arr = [];
            let employee = search.lookupFields({
                type: "employee",
                id: id,
                columns: [
                    "altname", 'custentity_pe_document_number', 'custentity_pe_code_document_type'
                ]
            });
            arr[0] = '';
            arr[1] = employee.custentity_pe_document_number;
            arr[2] = true;
            arr[3] = employee.altname;
            arr[4] = employee.custentity_pe_code_document_type;
            return arr;
        } catch (error) {
            log.error('error-getemployee', error);
        }
    }

    return {
        execute: execute
    }
});