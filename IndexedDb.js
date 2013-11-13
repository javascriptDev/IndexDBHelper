/**
 * Created by 宇乔 on 13-11-12.
 */


(function (window) {
    var A = {
        create: function (dbname, dbInfo, successFn, errorFn, version) {

            var me = this;
            this.dbName = dbname;
            this.version = version;
            for (var i = 0, len = dbInfo.length; i < len; i++) {
                me.generateModel(dbInfo[i]);
            }
            this.open(dbname, version,
                function success(request) {
                    if (me.isFunction(successFn)) {
                        successFn.call(this, request);
                    }
                },
                function error() {
                    if (me.isFunction(errorFn)) {
                        errorFn.call(this);
                    }
                },
                function update(event) {
                    for (var i = 0, len = dbInfo.length; i < len; i++) {
                        var info = dbInfo[i];
                        var objectStore = event.currentTarget.result.createObjectStore(info.name,
                            { keyPath: "id", autoIncrement: true });
                        for (var j = 0, l = info.index.length; j < l; j++) {
                            objectStore.createIndex(info.index[j].key || 'null', info.index[j].key || 'null', { unique: info.index[j].unique || false });
                        }

                    }

                }, dbInfo);

        },

        open: function (dbname, version, success, error, update, dbInfo) {
            var me = this;
            window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
            window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
            window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
            if (!window.indexedDB) {
                error.call(null);
                return;
            }
            var req = window.indexedDB.open(dbname, version);

            req.onerror = function (event) {
                if (me.isFunction(error)) {
                    error.call(this, event);
                }
            };
            req.onsuccess = function (event) {

                if (me.isFunction(success)) {
                    success.call(this, req, event);
                }
            };
            req.onupgradeneeded = function (event) {
                if (me.isFunction(update)) {

                    update.call(this, event);
                }
            };
        },
        getIndexFields: function (index) {
            var indexfiled = [];
            index.forEach(function (item) {
                indexfiled.push(item['key']);
            });
            return indexfiled;
        },
        getIndex: function () {

            var fields = [];
            var result = {};
            var indexs = this.indexFields;
            var that = this;
            for (var i in this) {
                if (this.hasOwnProperty(i)) {
                    if (this[i] != 'undefined') {
                        fields.push(i);
                    }
                }
            }
            fields.forEach(function (item) {
                if (indexs.indexOf(item) != -1) {
                    result['key'] = item;
                    result['value'] = that[item];
                }
            });

            return result;
        },
        generateModel: function (info) {
            var fName = info.name;
            var fields = info.fields;
            var me = this;
            var cons = '';
            var method = '';

            fields.forEach(function (item) {
                cons += 'this.' + item + '=data.' + item + ';';
            })

            var index = me.getIndexFields(info.index);

            cons += fName + '.prototype.version=' + this.version + ';' + fName + '.prototype.dbName="' + this.dbName + '";' + fName + '.prototype.tbName="' + fName + '";' + fName + '.prototype.indexFields="' + index + '";' + fName + '.prototype.fields="' + fields + '";';
            var add = fName + '.prototype.add= function (data,fn) { ' +
                'var that=this;' +
                'me.open(me.dbName,' +
                    ' me.version,' +
                    'function success(req) {' +
                        'var db=req.result;' +
                        'var transaction = db.transaction(that.__proto__.tbName,"readwrite");' +
                        'var itemStore = transaction.objectStore(that.__proto__.tbName);' +
                        'var sourceData=that.getSourceData();' +
                        'if(sourceData){' +
                             'data=sourceData' +
                        '}' +
                        'var request = itemStore.add( data);' +
                        'request.onsuccess = function (evt) {};' +
                        'transaction.oncomplete = function (event) {if(me.isFunction(fn)){fn(event.type);db.close()}};' +
                        'transaction.onerror = function (event) {if(me.isFunction(fn)){fn(event);db.close()}};' +
                    '}' +
                ');' +
            '}';

            var getSourceData = fName + '.prototype.getSourceData=function(){' +
                'var me=this;' +
                'var obj={};' +
                'var keys=Object.keys(this);' +
                'keys.forEach(function(item){' +
                'if(me.hasOwnProperty(item)){' +
                'obj[item]=me[item] }' +
                '}' +
                '); return obj;}';

            var del = fName + '.prototype.delete=function(fn){' +
                    'var that = this;' +
                    'me.open(me.dbName ,' +
                        ' me.version ,' +
                        'function success(req) {' +
                            'var db = req.result;' +
                            'var transaction = req.result.transaction(that.__proto__.tbName,"readwrite");' +
                            'var itemStore = transaction.objectStore(that.__proto__.tbName);' +
                            'var getSearchData = me.getIndex.call(that);' +
                            'var getData = itemStore.index(getSearchData.key).get(getSearchData.value);' +
                            'getData.onsuccess = function(data){' +
                                    'if(data.target.result){' +
                                        'var deleteFn = itemStore.delete(data.target.result.id);' +
                                        'deleteFn.onsuccess = function(e){' +
                                             'if( me.isFunction(fn) ){ fn(e.type);db.close();}' +
                                        '};' +
                                        'deleteFn.onerror = function(evt){' +
                                           'if( me.isFunction(fn) ){ fn(evt);db.close();}' +
                                        '}' +
                                    '}else{' +
                                        'if( me.isFunction(fn) ){ fn("not find item to delete");db.close();}' +
                                    '}' +
                            '};' +
                            'getData.onerror = function(e){' +
                                 'if( me.isFunction(fn) ){ fn(e);db.close();}' +
                            '}' +
                        '}' +
                    ');' +
            '}';
            var update = fName + '.prototype.update=function(newData,fn){' +
                'var that=this;' +
                'me.open(me.dbName,' +
                    ' me.version,' +
                    'function success(req) {' +
                        'var db = req.result;' +
                        'var transaction = db.transaction(that.__proto__.tbName,"readwrite");' +
                        'var getSearchData = me.getIndex.call(that);' +
                        'var store = transaction.objectStore(that.__proto__.tbName),' +
                        'itemStore=store.index(getSearchData.key).get(getSearchData.value);' +
                        'itemStore.onsuccess = function(evt){' +
                            'if(evt.target.result){' +
                                'var model = evt.target.result;' +
                                'for(var i in newData){' +
                                     'model[i] = newData[i];' +
                                '}' +
                                'store.put(model); ' +
                                'if(me.isFunction(fn)){fn(evt.type);} ' +
                                'db.close();' +
                            '}else{' +
                                'if( me.isFunction(fn) ){ fn("not find this item"); db.close();}' +
                             '};' +
                        'itemStore.onerror=function(evt){' +
                            'if( me.isFunction(fn) ){fn(evt);} db.close();}' +
                       '}' +
                    '}' +
                ');' +
           '}';

            var get = fName + '.prototype.get=function(fn){' +
                'var that=this;' +
                'me.open(me.dbName,' +
                    ' me.version,' +
                    'function success(req) {' +
                        'var db=req.result;' +
                        'var transaction = req.result.transaction(that.__proto__.tbName,"readwrite");' +
                        'var itemStore = transaction.objectStore(that.__proto__.tbName);' +
                        'var cur = itemStore.openCursor(IDBKeyRange.lowerBound(0));' +
                        ' var dataList=[];' +
                        'cur.onsuccess=function(evt){' +
                            'var cursor=evt.target.result;' +
                            'if(cursor){' +
                                    'dataList.push(cursor.value);' +
                                    'cursor.continue();' +
                                '}' +
                            'else{' +
                                     'if(me.isFunction(fn)){fn(dataList);db.close();}' +
                                '}' +
                        '};' +
                         'cur.onerror=function(){' +
                            'if(me.isFunction(fn)){ fn("not get this item");db.close(); }' +
                        '}' +
                    '}' +
                ');' +
            '}';

            eval(fName + " = function (data) {" + cons + "}");
            eval(add);
            eval(getSourceData);
            eval(get);
            eval(update);
            eval(del);

        },
         isFunction: function (o) {
            return o && Object.prototype.toString.call(o) == '[object Function]';
        },
        isObject: function (o) {
            return o && Object.prototype.toString.call(o) == '[object Object]';
        }


    };
    window['Index'] = A;
}(window))











