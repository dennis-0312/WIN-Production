/**
 * @NApiVersion 2.x
 * @NScriptType plugintypeimpl
 */
define(['N/email', 'N/encode', 'N/format', 'N/https', 'N/record', 'N/search', 'N/file', './umploadparts.js'],
    /**
     * @param{email} email
     * @param{encode} encode
     * @param{format} format
     * @param{https} https
     * @param{record} record
     * @param{search} search
     * 
     * send - This function is the entry point of our plugin script
    * @param {Object} plugInContext
    * @param {String} plugInContext.scriptId
    * @param {String} plugInContext.sendMethodId
    * @param {String} plugInContext.eInvoiceContent
    * @param {Array}  plugInContext.attachmentFileIds
    * @param {String} plugInContext.customPluginImpId
    * @param {Number} plugInContext.batchOwner
    * @param {Object} plugInContext.customer
    * @param {String} plugInContext.customer.id
    * @param {Array}  plugInContext.customer.recipients
    * @param {Object} plugInContext.transaction
    * @param {String} plugInContext.transaction.number
    * @param {String} plugInContext.transaction.id
    * @param {String} plugInContext.transaction.poNum
    * @param {String} plugInContext.transaction.tranType
    * @param {Number} plugInContext.transaction.subsidiary
    * @param {Object} plugInContext.sender
    * @param {String} plugInContext.sender.id
    * @param {String} plugInContext.sender.name
    * @param {String} plugInContext.sender.email
    * @param {Number} plugInContext.userId
    *
    * @returns {Object}  result
    * @returns {Boolean} result.success
    * @returns {String}  result.message
     */
    function (email, encode, format, https, record, search, file, multiPartUpload_1) {
        var recordtype = '';
        var internalId = '';
        var userId = '';
        var FOLDER_PDF = 591;
        const URL_TOKEN = 'https://ose.efact.pe/api-efact-ose/oauth/token';
        const URL_DOCUMENT = 'https://ose.efact.pe/api-efact-ose/v1/document';

        function send(pluginContext) {
            internalId = pluginContext.transaction.id;
            userId = pluginContext.sender.id;
            var transaction = pluginContext.transaction;
            var tranType = pluginContext.transaction.tranType
            var result = {};
            var request;
            var send = new Array();
            var array = [internalId, userId, tranType];

            logStatus(internalId, 'Debug4 ' + JSON.stringify(transaction));
            logStatus(internalId, 'Debug5 ' + tranType);

            result = {
                success: true,
                message: JSON.stringify(transaction)
            };

            try {
                var getcredentials = openCredentials(array);
                var request = getIdentifyDocument(internalId);
                var headers1 = [];
                headers1['Accept'] = '*/*';
                headers1['Content-Type'] = 'application/json';
                headers1['Authorization'] = 'Basic Y2xpZW50OnNlY3JldA==';

                var respAsset = https.post({
                    url: "https://ose.efact.pe/api-efact-ose/oauth/token?username=" + getcredentials.username + "&password=" + getcredentials.password + "&grant_type=password",
                    headers: headers1
                });
                var reponse = JSON.parse(respAsset.body);

                send = sendDocument(request.filename, request.request, reponse.access_token);
                var tiempoInicio = new Date().getTime();
                var tiempoTranscurrido = 0;
                while (tiempoTranscurrido < 20000) {
                    tiempoTranscurrido = new Date().getTime() - tiempoInicio;
                }
                logStatus(array[0], send.description);
                if (send.code == '0') {
                    var getpdf = getDocumentPDF(send.description, reponse.access_token);
                    var getxml = getDocumentXML(send.description, reponse.access_token);
                    var getcdr = getDocumentCDR(send.description, reponse.access_token);

                    sleep(3000);
                    var filepdf = generateFilePDF(request.filename, getpdf.pdf);
                    var filexml = generateFileXML(request.filename, getxml.pdf);
                    var filecdr = generateFileCDR(request.filename, getcdr.pdf);

                    if (!(filepdf && filexml && filecdr)) {
                        var error = JSON.parse(getpdf.pdf);
                        result = {
                            success: false,
                            message: error
                        };
                        return result;
                    }

                    filepdf = file.load({ id: filepdf });
                    filexml = file.load({ id: filexml });
                    filecdr = file.load({ id: filecdr });
                    var recordSet = setRecord(tranType, internalId, filepdf.url, filexml.url, filecdr.url);
                    result = {
                        success: true,
                        message: JSON.stringify(transaction)
                    };
                } else {
                    result.success = false;
                    result.message = send.description;
                }
            } catch (error) {
                result = {
                    success: false,
                    message: error.message
                };
            }
            return result;
        }

        function openCredentials(array) {
            try {
                var accountSearch = search.create({
                    type: array[2],
                    filters: [
                        search.createFilter({
                            name: "internalid", operator: search.Operator.IS, values: [array[0]]
                        })
                    ],
                    columns: ["subsidiary"]
                });

                var searchResult = accountSearch.run().getRange({ start: 0, end: 1 });

                var accountSearchs = search.create({
                    type: 'customrecord_pe_ei_enable_features',
                    filters: [
                        search.createFilter({
                            name: "custrecord_pe_ei_subsidiary", operator: search.Operator.IS, values: [searchResult[0].getValue({ name: "subsidiary" })]
                        })
                    ],
                    columns: ["internalid"]
                });

                var searchResults = accountSearchs.run().getRange({ start: 0, end: 1 });

                var credentials = search.lookupFields({
                    type: 'customrecord_pe_ei_enable_features',
                    id: searchResults[0].getValue({ name: "internalid" }),
                    columns: ['custrecord_pe_ei_url_ws', 'custrecord_pe_ei_user', 'custrecord_pe_ei_password', 'custrecord_pe_ei_employ_copy']
                });

                return {
                    wsurl: credentials.custrecord_pe_ei_url_ws,
                    username: credentials.custrecord_pe_ei_user,
                    password: credentials.custrecord_pe_ei_password
                }
            } catch (e) {
                //logError(array[0], array[1], 'Error-openCredentials', e.message);
            }
        }

        function getIdentifyDocument(internalid) {

            var searchLoad = search.create({
                type: "transaction",
                filters:
                    [
                        [["type", "anyof", "CustCred"], "OR", ["type", "anyof", "CustInvc"], "OR", ["type", "anyof", "ItemShip"], "OR", ["type", "anyof", "VendCred"]],
                        "AND",
                        ["internalid", "anyof", internalid]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "formulatext",
                            formula: "CASE WHEN {custbody_pe_document_type} = 'Factura' THEN '01' WHEN {custbody_pe_document_type} = 'Boleta de Venta' THEN '03' WHEN {custbody_pe_document_type} = 'Nota de Debito' THEN '08' WHEN {custbody_pe_document_type} = 'Nota de Credito' THEN '07' END",
                            label: "typedoccode"
                        }),
                        search.createColumn({ name: "formulatext", formula: "CONCAT({custbody_pe_serie}, CONCAT('-', {custbody_pe_number}))", label: "numeracion" }),
                        search.createColumn({ name: "formulanumeric", formula: "TO_NUMBER({custbody_pe_number})", label: "correlativo" }),
                        search.createColumn({ name: "custbody_pe_serie", label: "serie" }),
                        search.createColumn({ name: "internalid", join: "customer", label: "emailrec" }),
                        search.createColumn({ name: "legalname", join: "subsidiary", label: "emisname" }),
                        search.createColumn({ name: "custbody_pe_document_type", label: "typedoc" }),
                        search.createColumn({ name: "taxidnum", join: "subsidiary", label: "rucemi" }),
                        search.createColumn({ name: "custbody_pe_ei_printed_xml_req", label: "request" })
                    ]
            });

            var searchResult = searchLoad.run().getRange({ start: 0, end: 1 });
            var typedoccode = searchResult[0].getValue(searchLoad.columns[0]);
            var numbering = searchResult[0].getValue(searchLoad.columns[1]);
            var correlativo = searchResult[0].getValue(searchLoad.columns[2]);
            var serie = searchResult[0].getText({ name: "custbody_pe_serie", label: "serie" });
            var emailrec = searchResult[0].getValue({ name: "internalid", join: "customer", label: "emailrec" });
            var emisname = searchResult[0].getValue({ name: "legalname", join: "subsidiary", label: "emisname" });
            var typedoc = searchResult[0].getText({ name: "custbody_pe_document_type", label: "typedoc" });
            var rucemi = searchResult[0].getValue({ name: "taxidnum", join: "subsidiary", label: "rucemi" });
            var request = searchResult[0].getValue({ name: "custbody_pe_ei_printed_xml_req", label: "request" });
            var filename = rucemi + '-' + typedoccode + '-' + numbering;

            logStatus(internalid, JSON.parse(request));
            return {
                typedoccode: typedoccode,
                numbering: numbering,
                correlativo: correlativo,
                serie: serie,
                emailrec: emailrec,
                emisname: emisname,
                typedoc: typedoc,
                filename: filename,
                request: request
            }

        }

        function getDocumentPDF(documento, token) {
            var headers1 = new Array();
            try {

                headers1['Accept'] = '*/*';

                headers1['Authorization'] = 'Bearer ' + token;
                var response = https.get({
                    url: 'https://ose.efact.pe/api-efact-ose/v1/pdf/' + documento,
                    body: '',
                    headers: headers1
                });
                log.debug('response', response);
                //var body = JSON.parse(response.body);

                logStatus(internalId, 'Debug3 ' + JSON.stringify(response));

                return {

                    pdf: response.body
                }
            } catch (error) {
                return error;
                //logError(array[0], array[1], 'Error-getDocumentPDF', JSON.stringify(e));
            }
        }

        function getDocumentXML(documento, token) {
            var headers1 = new Array();
            try {
                headers1['Accept'] = '*/*';
                headers1['Authorization'] = 'Bearer ' + token;
                var response = https.get({
                    url: 'https://ose.efact.pe/api-efact-ose/v1/xml/' + documento,
                    body: '',
                    headers: headers1
                });
                log.debug('response', response);
                //var body = JSON.parse(response.body);

                logStatus(internalId, 'Debug3 ' + JSON.stringify(response));

                return {
                    pdf: response.body
                }
            } catch (error) {
                return error;
                //logError(array[0], array[1], 'Error-getDocumentPDF', JSON.stringify(e));
            }
        }

        function getDocumentCDR(documento, token) {
            var headers1 = new Array();
            try {
                headers1['Accept'] = '*/*';
                headers1['Authorization'] = 'Bearer ' + token;
                var response = https.get({
                    url: 'https://ose.efact.pe/api-efact-ose/v1/cdr/' + documento,
                    body: '',
                    headers: headers1
                });
                log.debug('response', response);
                //var body = JSON.parse(response.body);

                logStatus(internalId, 'Debug3 ' + JSON.stringify(response));

                return {

                    pdf: response.body
                }
            } catch (error) {
                return error;
                //logError(array[0], array[1], 'Error-getDocumentPDF', JSON.stringify(e));
            }
        }

        function sendDocument(filename, request, access_token) {
            var headers1 = new Array();
            try {
                var files = [
                    { name: filename, value: file.load({ id: request }) } // file cabinet ids; you can use dynamic files
                ];

                var headers = [];
                headers['Accept'] = '*/*';
                headers['Authorization'] = 'Bearer ' + access_token;


                var resp = multiPartUpload_1.uploadParts('https://ose.efact.pe/api-efact-ose/v1/document', headers, files);
                resp = JSON.parse(resp.body);
                return resp;
            } catch (error) {
                return error;
                //logError(array[0], array[1], 'Error-sendDocument', JSON.stringify(e));
            }
        }


        function generateFilePDF(namefile, content) {
            try {
                var fileObj = file.create({
                    name: namefile + '.pdf',
                    fileType: file.Type.PDF,
                    contents: content,
                    folder: FOLDER_PDF,
                    isOnline: true
                });
                var fileid = fileObj.save();
                return fileid;
            } catch (error) {
                logStatus(internalId, JSON.stringify(error));
                return false;
                //logError(array[0], array[1], 'Error-generateFilePDF', e.message);
            }
        }


        function generateFileXML(namefile, content) {
            try {
                var xml = base64Decoded(content);
                var fileObj = file.create({
                    name: namefile + '.xml',
                    fileType: file.Type.XMLDOC,
                    contents: xml,
                    folder: FOLDER_PDF,
                    isOnline: true
                });
                var fileid = fileObj.save();
                return fileid;
            } catch (e) {
                //logError(array[0], array[1], 'Error-generateFileXML', e.message);
            }
        }

        function generateFileCDR(namefile, content) {
            try {
                var cdr = base64Decoded(content);
                var fileObj = file.create({
                    name: namefile + '-CDR.xml',
                    fileType: file.Type.XMLDOC,
                    contents: cdr,
                    folder: FOLDER_PDF,
                    isOnline: true
                });
                var fileid = fileObj.save();
                return fileid;
            } catch (e) {
                //logError(array[0], array[1], 'Error-generateFileCDR', e.message);
            }
        }


        function sleep(milliseconds) {
            var start = new Date().getTime();
            for (var i = 0; i < 1e7; i++) {
                if ((new Date().getTime() - start) > milliseconds) {
                    break;
                }
            }
        }


        function random() {
            return Math.random().toString(36).substr(2); // Eliminar `0.`
        }


        function token() {
            return random() + random() + random() + random() + random(); // Para hacer el token más largo
        }


        function logStatus(internalid, docstatus) {
            try {
                var logStatus = record.create({ type: 'customrecord_pe_ei_document_status' });
                logStatus.setValue('custrecord_pe_ei_document', internalid);
                logStatus.setValue('custrecord_pe_ei_document_status', docstatus);
                logStatus.save();
            } catch (error) {
                logStatus(internalId, error);
            }
        }


        function logError(internalid, response) {
            try {
                var logError = record.create({ type: 'customrecord_pe_ei_log_documents' });
                logError.setValue('custrecord_pe_ei_log_related_transaction', internalid);
                logError.setValue('custrecord_pe_ei_log_subsidiary', 3);
                logError.setValue('custrecord_pe_ei_log_employee', plugInContext.userIdd);
                logError.setValue('custrecord_pe_ei_log_status', 'Error');
                logError.setValue('custrecord_pe_ei_log_response', response);
                logError.save();
            } catch (e) {

            }
        }


        function sendEmail(success, arrayheader, arraybody, recordtype, array) {
            try {
                var sender = arrayheader[0];
                var recipient = arrayheader[1];
                var emisname = arrayheader[2];
                var tranid = arrayheader[3];
                var typedoc = arrayheader[4];
                var docstatus = arrayheader[5];
                var pdfid = arrayheader[6];
                var xmlid = arrayheader[7];
                var cdrid = arrayheader[8];
                var jsonid = arrayheader[9];
                var encodepdf = arrayheader[10];
                var internalid = arraybody[0];

                var subject = emisname + " - " + typedoc + "  " + tranid + ": " + docstatus;
                var body = '';
                if (success) {
                    body += '<p>Este es un mensaje automático de EVOL Latinoamerica.</p>';
                    body += '<p>Se ha generado la ' + typedoc + ' <b>' + tranid + '</b> con Internal ID <b>' + internalid + '</b> y estado <b>' + docstatus + '</b>.</p>';
                } else {
                    body += '<p>Este es un mensaje de error automático de EVOL Latinoamerica .</p>';
                    body += '<p>Se produjo un error al emitir la ' + typedoc + ' <b>' + tranid + '</b> con Internal ID <b>' + internalid + '</b> y estado <b>' + docstatus + '</b>.</p>';
                    // if (mensajeError != '') {
                    //     body += '<p>El error es el siguiente:</p>';
                    //     body += '<p>' + mensajeError + '</p>';
                    // }
                }

                var filepdf = file.load({ id: pdfid });
                var filexml = file.load({ id: xmlid });
                var filecdr = file.load({ id: cdrid });
                //var filejson = file.load({ id: jsonid });

                email.send({
                    author: sender,
                    recipients: [recipient],
                    subject: subject,
                    body: body,
                    attachments: [filepdf, filexml, filecdr]
                });

                var setrecord = setRecord(recordtype, internalid, tranid, filepdf.url, filexml.url, filecdr.url, 0, encodepdf, array);
                return setrecord;
            } catch (error) {

                //logError(array[0], array[1], 'Error-SendEmail', e.message);
            }
        }


        //function setRecord(recordtype, internalid, tranid, urlpdf, urlxml, urlcdr, urljson, encodepdf, array) {
        function setRecord(recordtype, internalid, urlpdf, urlxml, urlcdr) {
            var recordload = '';
            try {
                if (recordtype == 'invoice') {
                    recordload = record.load({ type: record.Type.INVOICE, id: internalid, isDynamic: true })
                } else if (recordtype == 'creditmemo') {
                    recordload = record.load({ type: record.Type.CREDIT_MEMO, id: internalid });
                } else if (recordtype == 'vendorcredit') {
                    recordload = record.load({ type: 'vendorcredit', id: internalid });
                } else if (recordtype == 'itemfulfillment') {
                    recordload = record.load({ type: 'itemfulfillment', id: internalid });
                }
                logStatus(internalId, 'internalid: ' + internalid + '-' + urlxml);
                //recordload = record.load({ type: record.Type.INVOICE, id: internalid, isDynamic: true })
                //recordload.setValue('custbody_pe_fe_ticket_id', tranid);
                //recordload.setValue('custbody_pe_ei_printed_xml_req', urljson);
                recordload.setValue('custbody_pe_ei_printed_xml_res', urlxml);
                recordload.setValue('custbody_pe_ei_printed_cdr_res', urlcdr);
                recordload.setValue('custbody_pe_ei_printed_pdf', urlpdf);
                //recordload.setValue('custbody_pe_ei_printed_pdf_codificado', encodepdf);
                recordload.save();
                // recordload = record.create({type: 'customrecord_pe_ei_printed_fields',isDynamic: true});
                // recordload.setValue('name', tranid);
                // recordload.setValue('custrecord_pe_ei_printed_xml_req', urljson);
                // recordload.setValue('custrecord_pe_ei_printed_xml_res', urlxml);
                // recordload.setValue('custrecord_pe_ei_printed_pdf', urlpdf);
                // recordload.setValue('custrecord_pe_ei_printed_cdr_res', urlcdr);
                // recordload.save();
                return recordload;
            } catch (error) {

                //logError(array[0], array[1], 'Error-setRecord', e.message);
            }
        }

        function base64Encoded(content) {
            var base64encoded = encode.convert({
                string: content,
                inputEncoding: encode.Encoding.UTF_8,
                outputEncoding: encode.Encoding.BASE_64
            });
            return base64encoded;
        }


        function base64Decoded(content) {
            var base64decoded = encode.convert({
                string: content,
                inputEncoding: encode.Encoding.BASE_64,
                outputEncoding: encode.Encoding.UTF_8
            });
            return base64decoded;
        }
        return {
            send: send
        };
    });