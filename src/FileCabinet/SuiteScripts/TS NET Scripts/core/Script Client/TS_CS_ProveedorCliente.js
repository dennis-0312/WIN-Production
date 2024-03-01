/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
define(['N/currentRecord', 'N/search', 'N/ui/dialog'], (currentRecord, search, dialog) => {
    const CUSTOMER = 'customer';
    const VENDOR = 'vendor';
    let typeMode = '';
    
    const pageInit = (scriptContext) => {
        try {
            typeMode = scriptContext.mode;
        } catch (e) {
            console.log('Error en pageInit', e);
        }
    }

    const saveRecord = (scriptContext) => {
        try {

            let currentRecord = scriptContext.currentRecord;
            let tipo_documento = currentRecord.getValue('custentity_pe_document_type');
            let pe_document_number = currentRecord.getValue('custentity_pe_document_number');
            let type_transaction = currentRecord.type;

            if(type_transaction == VENDOR || type_transaction == CUSTOMER){
                if(type_transaction == VENDOR){
                    if(tipo_documento == '2'){
                        if(pe_document_number.length != 8){
                            let options = { title: 'Información', message: 'El PE NUMERO DOCUMENTO IDENTIDAD debe contener 8 caracteres.' }
                            dialog.alert(options);
                            return false;
                        }
                    } else if (tipo_documento == '4'){
                        if(pe_document_number.length != 11){
                            let options = { title: 'Información', message: 'El PE NUMERO DOCUMENTO IDENTIDAD debe contener 11 caracteres.' }
                            dialog.alert(options);
                            return false;
                        }
                    }
                }
            }
            return true;
        } catch (error) {
            console.log('Error-saveRecord: ' + error);
        }
    }

    const fieldChanged = (scriptContext) => {
        try {            
            let currentRecord = scriptContext.currentRecord;
            var sublistFieldName = scriptContext.fieldId;
            let pe_document_number = currentRecord.getValue('custentity_pe_document_number');
            let type_transaction = currentRecord.type;
            let nombre = '';

            console.log('typeMode ',typeMode);
            console.log('type_transaction ',type_transaction);
            console.log('sublistFieldName ',sublistFieldName);
            if(typeMode == 'create' || typeMode == 'edit' || typeMode == 'copy'){
                if(type_transaction == VENDOR || type_transaction == CUSTOMER){

                    let persona = currentRecord.getValue('isperson');
                    if(type_transaction == VENDOR){
                        if(sublistFieldName == 'custentity_pe_document_number'){
                            currentRecord.setValue({ fieldId: 'vatregnumber', value: pe_document_number, ignoreFieldChange: true, forceSyncSourcing: true })
                        }

                        if(sublistFieldName == 'isperson'){
                            if(persona == 'T'){
                                var firstname = currentRecord.getValue('firstname');
                                var lastname = currentRecord.getValue('lastname');
                                nombre = firstname + ' ' + lastname;
                                currentRecord.setValue({ fieldId: 'legalname', value: nombre, ignoreFieldChange: true, forceSyncSourcing: true })
                            } else {
                                var companyName = currentRecord.getValue('companyname');
                                nombre = companyName;
                                currentRecord.setValue({ fieldId: 'legalname', value: nombre, ignoreFieldChange: true, forceSyncSourcing: true })
                            }
                        }

                        if(persona == 'T'){
                            var firstname = currentRecord.getValue('firstname');
                            var lastname = currentRecord.getValue('lastname');
                            nombre = firstname + ' ' + lastname;
                            console.log('nombre ' + nombre);
                            if(sublistFieldName == 'firstname' || sublistFieldName == 'lastname'){
                                currentRecord.setValue({ fieldId: 'legalname', value: nombre, ignoreFieldChange: true, forceSyncSourcing: true })
                            }
                        } else {
                            var companyName = currentRecord.getValue('companyname');
                            nombre = companyName;
                            console.log('nombre ' + nombre);
                            if(sublistFieldName == 'companyname'){
                                currentRecord.setValue({ fieldId: 'legalname', value: nombre, ignoreFieldChange: true, forceSyncSourcing: true })
                            }
                        }
                    } else if(type_transaction == CUSTOMER){
                        if(sublistFieldName == 'custentity_pe_document_number'){
                            currentRecord.setValue({ fieldId: 'vatregnumber', value: pe_document_number, ignoreFieldChange: true, forceSyncSourcing: true })
                        }
                    }
                }
            }

        } catch (error) {
            console.log('Error-fieldChanged: ' + error);
        }
    }

    return {
        pageInit: pageInit,
        saveRecord: saveRecord,
        fieldChanged: fieldChanged
    }
});
/*********************************************************************************************************************************************
TRACKING
/*********************************************************************************************************************************************
Commit:01
Version: 1.0
Date: 25/05/2022
Author: Dennis Fernández
Description: Creación del script en SB.
==============================================================================================================================================*/