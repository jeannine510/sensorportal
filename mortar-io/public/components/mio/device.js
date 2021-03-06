(function() {
    var app = angular.module('device-services', ['mortar-services', 'angular.filter']);
    app.factory('Device', function($q, Mio, User) {

        var DeviceService = {
            devices: {},
            references: {}
        };

        function Device(id) {
            this.id = id;
            this.references = {};
            this.references.children = {};
            this.references.parents = {};
            this.references.others = {};
            this.interfaces = null;
            this.storage = [];
            this.children = [];
            this.canActuate = false;
        };

        function Transducer(stanza) {
            this.name = stanza.getAttribute('name');
            this.max = stanza.getAttribute('maxValue');
            this.min = stanza.getAttribute('minValue');
            this.unit = stanza.getAttribute('unit');
            this.type = stanza.getAttribute('type');
            this.isActuable = stanza.getAttribute('interface') ? true : false;
            this.value = '';
            this.properties = {};
            this.e = {};
            var child_index, node, name, key;
            var nodes = stanza.childNodes;
            for (child_index = 0; child_index < nodes.length; child_index++) {
                var node = nodes[child_index];
                if (node.tagName == 'property') {
                    key = node.getAttribute('name');
                    value = node.getAttribute('value');
                    this.properties[key] = value;
                } else if (node.tagName == 'map') {
                    this.unit = 'enum';
                    name = node.getAttribute('name');
                    value = node.getAttribute('value');
                    this.e[parseInt(value)] = {
                        name: name,
                        value: value
                    };
                }
            }
        };

        /**
         * [prototype description]
         * @type Transducer
         */
        Transducer.prototype = {};

        Device.prototype = {
            _handleIqError: function(iq, deferred) {
                if (typeof iq == 'undefined' || iq == null) {
                    deferred.reject("Iq undefined");
                    return;
                }
                var error = iq.getElementsByTagName('error');
                var error_code = error[0].getAttribute('code');
                var error_type = error[0].getAttribute('type');
                var error_msg = error[0].childNodes[0].tagName;
                deferred.reject("Error Code: " + error_code +
                    " ,Type: " + error_type + ", Message: " + error_msg);
            },
            /* Stanza generation functions */
            _processRef: function(ref) {
                console.log(ref);
                return {
                    name: ref.name,
                    node: ref.id,
                    metaType: ref.metaType,
                    type: ref.type
                };
            },
            _getTransducerStanza: function(transducer) {
                var transducerStanza = $build('transducer', {
                    name: transducer.name,
                });
                if (typeof transducer.max != 'undefined') {
                    transducerStanza.attr({
                        maxValue: transducer.max
                    });
                }
                if (typeof transducer.min != 'undefined') {
                    transducerStanza.attr({
                        minValue: transducer.min
                    });
                }
                if (typeof transducer.min != 'undefined') {
                    transducerStanza.attr({
                        min: transducer.min
                    });
                }
                if (typeof transducer.unit != 'undefined') {
                    transducerStanza.attr({
                        unit: transducer.unit
                    });
                }
                if (typeof transducer.type != 'undefined') {
                    transducerStanza.attr({
                        type: transducer.type
                    });
                }
                for (propIndex in transducer.properties) {
                    if ($self.properties.hasOwnProperty(property_key)) {
                        property = {
                            name: propertyIndex,
                            value: transducer.properties[propertyIndex]
                        };
                        transducerStana.c('property', property).up();
                    }
                }
                if (typeof transducer.e != 'undefined') {
                    for (enumIndex = 0; enumIndex <
                        transducer.e.length; enumIndex++) {
                        var e = transducer.e[enumIndex];
                        var property = {
                            name: e,
                            value: enum_index
                        };
                        transducerStana.c('map', property).up();
                    }
                }
                return transducerStanza.up();
            },
            _parseTransducer: function(stanza) {
                return new Transducer(stanza);
            },

            /* Stanza Builder to build reference stanza from this.references */
            _getReferencesStanza: function() {
                var referenceStanza = $build('references', {});
                var ref_index, ref;

                for (ref_key in this.references.children) {
                    if (this.references.children[ref_key] == null)
                        continue;
                    ref = this._processRef(this.references.children[ref_key]);
                    if (ref.type == 'undefined') {
                        continue;
                    }
                    referenceStanza.c('reference', ref).up();
                }
                for (ref_key in this.references.parents) {
                    if (this.references.parents[ref_key] == null)
                        continue;
                    ref = this._processRef(this.references.parents[ref_key]);
                    if (ref.type == 'undefined') {
                        continue;
                    }
                    referenceStanza.c('reference', ref).up();
                }
                for (ref_key in this.references.others) {
                    if (this.references.others[ref_key] == null)
                        continue;
                    if (ref.type == 'undefined') {
                        continue;
                    }
                    ref = this._processRef(this.references.others[ref_key]);
                    referenceStanza.c('reference', ref).up();
                }
                return referenceStanza.up();
            },
            /*build Data Stanza for given transducer and command
             * @param string transducer name to publish data to
             * @param object command to send transducer.
             */
            _getDataStanza: function(transducer, value) {
                var dataStanza = $build('transducerSetData', {});
                var d_index, data;
                dataStanza.attrs({
                    name: transducer.name,
                    value: value,
                    timestamp: this._getTimestamp()
                });
                return dataStanza.up();
            },
            _transducersArray: function() {
                Object.keys(this.transducers).map(function(key) {
                    return this.transducers[key];
                });
            },
            /*build meta stanza for this event node
             */
            _getMetaStanza: function() {
                var $self = this;
                var metaStanza = $build('meta', {});
                if (typeof $self.name != 'undefined') {
                    metaStanza.attrs({
                        name: $self.name
                    });
                }
                if (typeof $self.metaType != 'undefined') {
                    metaStanza.attrs({
                        type: $self.metaType
                    });
                }
                if (typeof $self.info != 'undefined') {
                    metaStanza.attrs({
                        info: $self.info
                    });
                }
                metaStanza.attrs({
                    timestamp: $self._getTimestamp()
                });
                if (typeof $self.properties != 'undefined') {
                    for (propIndex in $self.properties) {
                        if ($self.properties.hasOwnProperty(propIndex)) {
                            property = {
                                name: propIndex,
                                value: $self.properties[propIndex]
                            };
                            metaStanza.c('property', property).up();
                        }
                    }
                }
                if (typeof $self.transducers != 'undefined') {
                    for (transducer_key in $self.transducers) {
                        metaStanza.c('transducer',
                            $self.transducers[transducer_key]).up();
                    }
                }
                if (typeof $self.geolocation != 'undefined') {
                    metaStanza.c('geoloc', $self.geolocation).up();
                }
                return metaStanza.up();
            },
            _getTimestamp: function() {
                var date = new Date();
                return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + "T" +
                    date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds()
            },
            /* Parses data from the items stanza
             * @param items contain the data items for this device's transducers
             */
            _parseData: function(items) {
                var data_index;
                var data;
                var data_node, name, tvalue, ttimestamp;
                var n_data = items[0].childNodes.length;
                if (typeof this.data == 'undefined') {
                    data = [];
                } else
                    data = this.data;
                for (data_index = 0; data_index < n_data; data_index++) {
                    data_node = items[0].childNodes[data_index];
                    name = data_node.getAttribute('id');
                    if (name[0] != '_') continue;
                    name = name.substr(1);
                    tvalue = data_node.childNodes[0].getAttribute('value');
                    ttimestamp = data_node.childNodes[0].getAttribute('timestamp');
                    data[name] = {
                        value: tvalue,
                        timestamp: ttimestamp
                    };
                }
                return data;
            },
            _parseGeolocation: function(stanza) {
                //todo
                var $self = this;
                var node, key, value, tran, nodes;
                $self.geolocation = {};
                if (typeof metaItem.childNodes[0].getAttribute('accuracy') != 'undefined')
                    $self.geolocation.accuracy = metaItem.childNodes[0].getAttribute('accuracy');
                if (typeof metaItem.childNodes[0].getAttribute('alt') != 'undefined') {
                    $self.geolocation.alt = metaItem.childNodes[0].getAttribute('alt');
                }
                if (typeof metaItem.childNodes[0].getAttribute('altaccuracy') != 'undefined') {
                    $self.geolocation.info = metaItem.childNodes[0].getAttribute('altaccuracy');
                }
                if (typeof stanza.childNodes[0].getAttribute('area') != 'undefined') {
                    $self.geolocation.area = metaItem.childNodes[0].getAttribute('area');
                }
                if (typeof stanza.childNodes[0].getAttribute('bearing') != 'undefined') {
                    $self.geolocation.bearing = metaItem.childNodes[0].getAttribute('bearing');
                }
                if (typeof stanza.childNodes[0].getAttribute('building') != 'undefined') {
                    $self.geolocation.building = metaItem.childNodes[0].getAttribute('building');
                }
                if (typeof stanza.childNodes[0].getAttribute('country') != 'undefined') {
                    $self.geolocation.country = metaItem.childNodes[0].getAttribute('country');
                }
                if (typeof stanza.childNodes[0].getAttribute('countrycode') != 'undefined') {
                    $self.geolocation.countrycode = metaItem.childNodes[0].getAttribute('countrycode');
                }
                if (typeof stanza.childNodes[0].getAttribute('datum') != 'undefined') {
                    $self.geolocation.datum = metaItem.childNodes[0].getAttribute('datum');
                }
                if (typeof stanza.childNodes[0].getAttribute('description') != 'undefined') {
                    $self.geolocation.description = metaItem.childNodes[0].getAttribute('description');
                }
                if (typeof stanza.childNodes[0].getAttribute('error') != 'undefined') {
                    $self.geolocation.error = metaItem.childNodes[0].getAttribute('error');
                }
                if (typeof stanza.childNodes[0].getAttribute('floor') != 'undefined') {
                    $self.geolocation.floor = metaItem.childNodes[0].getAttribute('floor');
                }
                if (typeof stanza.childNodes[0].getAttribute('lat') != 'undefined') {
                    $self.geolocation.lat = metaItem.childNodes[0].getAttribute('lat');
                }
                if (typeof stanza.childNodes[0].getAttribute('locality') != 'undefined') {
                    $self.geolocation.locality = metaItem.childNodes[0].getAttribute('locality');
                }
                if (typeof stanza.childNodes[0].getAttribute('lon') != 'undefined') {
                    $self.geolocation.locality = metaItem.childNodes[0].getAttribute('lon');
                }
                if (typeof stanza.childNodes[0].getAttribute('postalcode') != 'undefined') {
                    $self.geolocation.locality = metaItem.childNodes[0].getAttribute('postalcode');
                }
                if (typeof stanza.childNodes[0].getAttribute('region') != 'undefined') {
                    $self.geolocation.region = metaItem.childNodes[0].getAttribute('region');
                }
                if (typeof stanza.childNodes[0].getAttribute('room') != 'undefined') {
                    $self.geolocation.room = metaItem.childNodes[0].getAttribute('room');
                }
                if (typeof stanza.childNodes[0].getAttribute('speed') != 'undefined') {
                    $self.geolocation.speed = metaItem.childNodes[0].getAttribute('speed');
                }
                if (typeof stanza.childNodes[0].getAttribute('street') != 'undefined') {
                    $self.geolocation.street = metaItem.childNodes[0].getAttribute('street');
                }
                if (typeof stanza.childNodes[0].getAttribute('text') != 'undefined') {
                    $self.geolocation.text = metaItem.childNodes[0].getAttribute('text');
                }
                if (typeof stanza.childNodes[0].getAttribute('timestamp') != 'undefined') {
                    $self.geolocation.timestamp = metaItem.childNodes[0].getAttribute('timestamp');
                }
                if (typeof stanza.childNodes[0].getAttribute('tzo') != 'undefined') {
                    $self.geolocation.timestamp = metaItem.childNodes[0].getAttribute('tzo');
                }
                if (typeof stanza.childNodes[0].getAttribute('uri') != 'undefined') {
                    $self.geolocation.uri = metaItem.childNodes[0].getAttribute('uri');
                }
                return $self.geolocation;
            },
            /* Parses meta stanza into this devices meta data
             * @param Element Meta item element*/
            _parseMetaItem: function(metaItem) {
                var $self = this;
                var node, key, value, tran, nodes;
                if (typeof metaItem.childNodes[0].getAttribute('type') != 'undefined')
                    $self.metaType = metaItem.childNodes[0].getAttribute('type');
                if (typeof metaItem.childNodes[0].getAttribute('name') != 'undefined') {
                    $self.name = metaItem.childNodes[0].getAttribute('name');
                }
                if (typeof metaItem.childNodes[0].getAttribute('info') != 'undefined') {
                    $self.info = metaItem.childNodes[0].getAttribute('info');
                }
                if (typeof metaItem.childNodes[0].getAttribute('timestamp') != 'undefined') {
                    $self.timestamp = metaItem.childNodes[0].getAttribute('timestamp');
                }
                nodes = metaItem.childNodes[0].childNodes;
                $self.properties = {};
                $self.transducers = {};
                for (child_index = 0; child_index < nodes.length; child_index++) {
                    node = nodes[child_index];
                    if (node.tagName == 'property') {
                        key = node.getAttribute('name');
                        value = node.getAttribute('value');
                        if (typeof $self.properties[key] == 'undefined' ||
                            $self.properties[key] != value) {
                            $self.properties[key] = value;
                        }
                    } else if (node.tagName == 'transducer') {
                        tran = $self._parseTransducer(node);
                        $self.transducers[tran.name] = tran;
                        if (tran.isActuable) {
                            $self.canActuate = true;
                        }
                    } else if (node.tagName == 'geolocation') {
                        //todo
                        $self.geolocation = $self.parseGeolocation(node);
                    } else if (node.tagName == 'interface') {
                        $self.interfaces[node.getAttribute('name')] = true;
                    }
                }
            },
            _contains: function(str, strarr) {
                for (i = 0; i < strarr.length; i++) {
                    if (str == strarr[i])
                        return true;
                }
            },
            _parseReferenceItem: function(referenceItem) {
                var references;
                var $self = this;

                var nodes = referenceItem.childNodes;
                var node, nodeid, type, metaType, name;
                var reference;
                if ($self.references == 'undefined') {
                    $self.references = {};
                    $self.references.children = {};
                    $self.references.parents = {};
                    $self.references.others = {};
                }
                references = $self.references;
                $self.children = [];
                for (child_index = 0; child_index < nodes.length; child_index++) {
                    node = nodes[child_index];
                    name = node.getAttribute('name');
                    metaType = node.getAttribute('metaType');
                    nodeid = node.getAttribute('node');
                    type = node.getAttribute('type');
                    reference = {
                        type: type,
                        node: nodeid,
                        id: nodeid,
                        name: name,
                        label: name,
                        metaType: metaType,
                        children: []
                    };
                    if (type == 'child') {
                        references.children[nodeid] = reference;
                        $self.children.push(reference.id);
                    } else if (type == 'parent') {
                        references.parents[nodeid] = reference;
                    } else {
                        references.others[nodeid] = reference;
                    }
                }
                return references;
            },
            _parseStorageItem: function(storageItem) {
                var storage;
                var addressesItem = storageItem.childNodes[0];
                var nodes = addressesItem.childNodes;
                var address, node, key, found;
                storage = this.storage;
                for (child_index = 0; child_index < nodes.length; child_index++) {
                    node = nodes[child_index];
                    address = node.getAttribute('link');
                    key = node.getAttribute('key');
                    found = false;
                    for (storage_entry in storage) {
                        if (storage[storage_entry].address == address) {
                            storage[storage_entry].key = key;
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        storage.push({
                            address: address,
                            key: key
                        });
                    }
                }
                return storage;
            },
            /* init initializes meta references and storage information for a device
             *
             */
            init: function() {
                var $self = this;
                var deferred = $q.defer();
                if (typeof $self.id == 'undefined' || $self.id == '') {
                    deferred.reject("Invalid Event Id");
                    return deferred.promise;
                }
                if (typeof User.connection == 'undefined' ||
                    !User.connection.connected) {
                    deferred.reject("User not connected");
                    return deferred.promise;
                }
                User.connection.pubsub.items($self.id,
                    function(stanza) {
                        var items = stanza.getElementsByTagName('items');
                        var child, child_index, id;
                        var t_values = [];
                        var n_items = items[0].childElementCount;
                        for (child_index = 0; child_index < n_items; child_index++) {
                            child = items[0].childNodes[child_index];
                            id = child.getAttribute('id');
                            if (id == 'meta') {
                                $self._parseMetaItem(child);
                            } else if (id == 'references') {
                                $self._parseReferenceItem(child.childNodes[0]);
                            } else if (id == 'storage') {
                                $self.storage = $self._parseStorageItem(child);
                            }
                        }
                        $self.data = $self._parseData(items);
                        deferred.resolve($self);
                    },
                    function(error) {
                        deferred.resolve($self);
                    }, 100000);
                return deferred.promise;
            },
            /* configFormat Generates node configuration from a form
             * config configForm, potentially with extra fields such as description.
             */
            configFormat: function(config) {
                var configFormatted = {};
                var arrLen = config.length - 1;
                var confIndex;
                var confHold;
                for (confIndex = 0; confIndex < arrLen; confIndex++) {
                    confHold = config[confIndex];
                    configFormatted[confHold['var']] = confHold['value'];
                }
                return configFormatted
            },
            /* create Generates the event node, the act node, and then publishes
             * meta information, storage permissions, etc. */
            create: function(config) {
                var $self = this;
                var deferred = $q.defer();
                var config_deferred = $q.defer();
                if (typeof $self.config === 'undefined') {
                    config_deferred = $self.getConfig();
                } else {
                    config_deferred = $q.defer();
                    config_deferred.resolve($self.config);
                    config_deferred = config_deferred.promise;
                }
                config_deferred.then(function(config_result) {
                    User.connection.pubsub.createNode($self.id, $self.configFormat($self.config),
                        function(result) {
                            var type = result.getAttribute('type');
                            if (type == 'result') {
                                var promises = [];
                                DeviceService.references[$self.id] = $self;
                                DeviceService.devices[$self.id] = $self;
                                promises.push($self.setMeta());
                                promises.push($self.setReferences());
                                if ($self.storage.length > 0) {
                                    promises.push($self.setStorage());
                                }
                                var actPromise = $q.defer();
                                promises.push(actPromise.promise);
                                User.connection.pubsub.createNode($self.id + "_act",
                                    $self.configFormat($self.config),
                                    function(result) {
                                        actPromise.resolve(result);
                                    }
                                );
                                $q.all(promises).then(function(results) {
                                    deferred.resolve(results);
                                }, function(results) {
                                    deferred.reject(results);
                                });
                            } else {
                                deferred.reject(result);
                            }
                        });
                });
                return deferred.promise;
            },
            getMeta: function() {
                var $self = this;
                var deferred = $q.defer();
                Mio.item($self.id, ["meta"], function(stanza) {
                    var items = stanza.getElementsByTagName('items');
                    var metaItem;
                    if (items[0].childNodes.length == 0) {
                        deferred.reject("Could not get meta item.");
                        return;
                    }
                    metaItem = items[0].childNodes[0];
                    $self._parseMetaItem(metaItem);
                    deferred.resolve(true);
                }, function(error) {
                    deferred.reject(error);
                });
                return deferred.promise;
            },
            setMeta: function() {
                var $self = this;
                var metaStanza = $self._getMetaStanza();
                var deferred = $q.defer();
                if (typeof metaStanza === "undefined") {
                    console.log("coud not get meta stanza");
                    deferred.reject("Could not generate a meta stanza");
                    return deferred.promise;
                }
                Mio.publishItems([{
                        attrs: {
                            id: "meta"
                        },
                        data: metaStanza.tree()
                    }],
                    deferred, $self.id);
                return deferred.promise;
            },
            getData: function() {
                var $self = this;
                var deferred = $q.defer();
                var items = [];
                if (typeof $self.transducers == 'undefined') {
                    return;
                }
                for (t_index = 0; t_index < Object.keys($self.transducers).length; t_index++) {
                    items.push("_" + Object.keys($self.transducers)[t_index]);
                }
                if (items.length == 0) {
                    deferred.reject("No transducers in meta data");
                    return deferred.promise;
                }
                Mio.item($self.id, items, function(stanza) {
                    var items = stanza.getElementsByTagName('items');
                    if (items[0].childNodes.length == 0) {
                        deferred.reject("No items retrievied");
                        return;
                    }
                    $self.data = $self._parseData(items);
                    deferred.resolve(true);
                }, function(error) {
                    $self._handleIqError(error, deferred);
                });
                return deferred.promise;
            },
            hasTransducers: function() {
                if (typeof this.transducers === 'undefined') {
                    return false;
                }
                // transducers are objects mapping transducer name to transducer
                if (angular.equals({}, this.transducers)) {
                    return false;
                }
                return true;
            },
            getReferences: function() {
                var $self = this;
                var deferred = $q.defer();
                Mio.item($self.id, ["references"], function(stanza) {
                    var items = stanza.getElementsByTagName('items');
                    if (items[0].childNodes.length == 0) {
                        deferred.resolve(true);
                        return;
                    }
                    var referenceItem = items[0].childNodes[0];
                    $self._parseReferenceItem(referenceItem);
                    deferred.resolve(true);
                }, function(error) {
                    $self._handlerIqError(error);
                });
                return deferred.promise;
            },
            getStorage: function() {
                var $self = this;
                var deferred = $q.defer();
                Mio.item($self.id, ["storage"], function(stanza) {
                    var items = stanza.getElementsByTagName('items');
                    if (items[0].childNodes.length == 0) {
                        deferred.reject("Could not get storage item.");
                        return;
                    }
                    var storageItem = items[0].childNodes[0];
                    $self.storage = $self._parseStorageItem(storageItem);
                    deferred.resolve(true);
                }, function(error) {
                    deferred.reject(error);
                });
                return deferred.promise;
            },
            startStorage: function(storage_jid) {
                var deferred = $q.defer();
                var $self = this;
                $self.user.connection.pubsub.setAffiliation(this.id, storage_jid, 'publisher',
                    function(response) {
                        var type = response.getAttribute('type');
                        if (type == 'result') {
                            deferred.resolve(true);
                        } else if (type == 'error') {
                            this._handleIqError(result, deferred);
                        } else {
                            deferred.reject("Could not set storage publisher");
                        }
                    });
                return deferred;
            },
            actuate: function(transducer, command) {
                var $self = this;
                var deferred = $q.defer();
                data_stanza = $self._getDataStanza(transducer, command.value).tree();
                Mio.publishItems([{
                        attrs: {
                            id: '_' + transducer.name
                        },
                        data: data_stanza
                    }],
                    deferred, $self.id + '_act');
                return deferred.promise;
            },
            addReferences: function(references) {
                var $self = this;
                var deferred = $q.defer();
                if (references == null || references.length == 0) {
                    deferred.resolve(true);
                    deferred.promise;
                    return;
                }
                var getRefPromise = $self.getReferences();
                getRefPromise.then(function(response) {
                    var ref_index, type, ref;
                    for (ref_index = 0; ref_index < references.length; ref_index++) {
                        ref = references[ref_index];
                        type = ref.type;
                        var id = typeof ref.node == 'undefined' ? ref.id : ref.node;
                        console.log(ref.node);
                        ref.node = id;
                        if (type == 'child') {
                            $self.references.children[ref.node] = ref;
                        } else if (type == 'parent') {
                            $self.references.parents[ref.node] = ref;
                        } else {
                            $self.references.others[ref.node] = ref;
                        }
                    }
                    var datanode = $self._getReferencesStanza().tree();
                    Mio.publishItems([{
                        attrs: {
                            id: 'references'
                        },
                        data: datanode
                    }], deferred, $self.id);
                    DeviceService.references[$self.id] = $self;
                    $self.folders = $self.references.children;
                }, function(error) {
                    deferred.reject("Could not retrieve references.");
                });
                return deferred.promise;
            },
            removeReferences: function(references) {
                var deferred = $q.defer;
                var $self = this;
                var getRefPromise;
                getRefPromise = $self.getReferences();
                getRefPromise.then(function(response) {
                    var ref_index, type, ref, node;
                    for (ref_index = 0; ref_index < references.length; ref_index++) {
                        ref = references[ref_index];
                        console.log(ref);
                        type = ref.type;
                        if (typeof ref.node === 'undefined')
                            node = ref.id;
                        else
                            node = ref.node;
                        delete $self.references.children[node];
                        delete $self.references.parents[node];
                        delete $self.references.others[node];
                    }
                    var datanode = $self._getReferencesStanza().tree();
                    console.log(datanode);
                    Mio.publishItems([{
                        attrs: {
                            id: 'references'
                        },
                        data: datanode
                    }], deferred, $self.id);
                    $self.folders = $self.references.children;
                }, function(error) {
                    deferred.reject("Could not retrieve references.");
                });
                return deferred.promise;
            },
            _hasReferences: function() {
                var $self = this;
                var refs = Object.keys($self.references.children).length +
                    Object.keys($self.references.parents).length +
                    Object.keys($self.references.others).length;
                return refs > 0;
            },
            setReferences: function() {
                var deferred = $q.defer();
                var $self = this;
                var getRefPromise;
                if (typeof $self.references == 'undefined') {
                    deferred.resolve({});
                    return deferred.promise;
                } else {
                    var getRefDeferred = $q.defer();
                    getRefDeferred.resolve(true);
                    getRefPromise = getRefDeferred.promise;
                }
                if (!$self._hasReferences()) {
                    deferred.resolve(false);
                    return deferred.promise;
                }
                var datanode = $self._getReferencesStanza().tree();
                Mio.publishItems([{
                    attrs: {
                        id: 'references'
                    },
                    data: datanode
                }], deferred, $self.id);
                DeviceService.references[$self.id] = $self;
                DeviceService.devices[$self.id] = $self;
                return deferred.promise;
            },
            getSubOptions: function() {
                var deferred = $q.defer();
                var $self = this;
                User.connection.pubsub.getSubscriptions($self.id, function(result) {
                    var type = result.getAttribute('type');
                    if (type == 'result') {
                        var x = result.getElementsByTagName('x');
                        $self.suboptions = {};
                        for (childIndex = 0; childIndex < x.childNodes.length; childIndex++) {
                            var child = result.childNodes[childIndex];
                            var childType = child.getAttribte('type');
                            $self.suboptions[child.getAttribute('var')] = {
                                value: child.childNodes[0],
                                type: childType
                            };
                        }
                    } else if (type == 'errror') {
                        $self._handleIqError(result, deferred);
                    } else {
                        deferred.reject("Could not delete node: " + result);
                    }
                });
                return deferred.promise;
            },
            getSubscriptions: function() {
                var deferred = $q.defer();
                var $self = this;
                User.connection.pubsub.getNodeSubscriptions($self.id, function(result) {
                    var type = result.getAttribute('type');
                    if (type == 'result') {
                        var subscriptions = result.getElementsByTagName('subscriptions');
                        var jid, sub, subid;
                        for (subIndex = 0; subIndex < subscriptions.length; subIndex++) {
                            subscription = subscriptions.childNodes[subIndex];
                            jid = subscription.getAttribute('jid');
                            sub = subscription.getAttribute('subscription');
                            subid = subscription.getAttribute('subid');
                            this.subscriptions.push({
                                jid: jid,
                                subscription: sub,
                                subid: subid
                            });
                        }
                    } else if (type == 'error') {
                        $self._handleIqError(result, deferred);
                    } else {
                        deferred.reject("Could not getNodeSubscriptions: " + result);
                    }
                });
            },
            getAffiliations: function() {
                var deferred = $q.defer();
                var $self = this;
                User.connection.pubsub.getAffiliations($self.id, function(result) {
                    var type = result.getAttribute('type');
                    if (type == 'result') {
                        var affiliations = result.getElementsByTagName('affiliations');
                        this.affiliations = {};
                        this.affiliations.owner = [];
                        this.affiliations.publisher = [];
                        this.affiliations.outcast = [];

                        for (affilIndex = 0; affilIndex < affiliations[0].childNodes.length; affilIndex++) {
                            var affiliation = affiliations[0].childNodes[affilIndex];
                            var affilType = affiliation.getAttribute('affiliation');
                            var jid = affiliation.getAttribute('jid');
                            if (typeof $self.affiliations == 'undefined') {
                                $self.affiliations = {};
                            }
                            if (typeof $self.affiliations[affilType] == 'undefined') {
                                $self.affiliations[affilType] = [];
                            }
                            if (!$self._contains(jid, $self.affiliations[affilType])) {
                                $self.affiliations[affilType].push(jid);
                            }
                        }
                        deferred.resolve(true);
                    } else if (type == 'error') {
                        $self._handleIqError(result, deferred);
                    } else {
                        deferred.reject("Could not get node affiliations: " + result);
                    }
                });
                return deferred.promise;
            },
            addAffiliation: function(jid, affiliation, isAct) {
                var deferred = $q.defer();
                var $self = this;
                var id;
                if (typeof isAct === "undefined") {
                    isAct = false;
                }
                if (isAct) {
                    id = $self.id + "_act";
                } else {
                    id = $self.id;
                }

                User.connection.pubsub.setAffiliation(id, jid, affiliation,
                    function(result) {
                        var type = result.getAttribute('type');
                        if (type == 'result') {
                            deferred.resolve(true);
                        } else if (type == 'error') {
                            $self._handleIqError(result, deferred);
                        } else {
                            deferred.reject("Could not set affiliation");
                        }
                    });
                return deferred.promise;
            },
            removeAffiliation: function(jid) {
                return this.addAffiliation(jid, "none");
            },
            getChildByName: function(name) {
                for (childIndex in this.folders) {
                    child = this.folders[childIndex];
                    if (child.name == name || child.label == name) {
                        return child;
                    }
                }
                return null;
            },
            getConfig: function(defaultConfig) {
                defaultConfig = typeof defaultConfig == 'undefined' ? false : defaultConfig;
                var $self = this;
                var deferred = $q.defer();
                if (!defaultConfig) {
                    DeviceService.getDefaultConfig().then(function(config) {
                        $self.config = config;
                        deferred.resolve(config);
                    }, function(error) {
                        deferred.reject(error);
                    });
                } else {
                    User.connection.pubsub.getConfig($self.id, function(result) {
                        var type = result.getAttribute('type');
                        if (type == 'result') {
                            var x = result.getElementsByTagName('x');
                            $self.config = {};
                            for (configIndex = 0; configIndex < x[0].childNodes.length; configIndex++) {
                                var field = x[0].childNodes[configIndex];
                                var v = field.getAttribute('var');
                                var conftype = field.getAttribute('type');
                                var label = field.getAttribute('label');
                                var value = field.childNodes[0].toString();
                                $self.config[v] = {
                                    var: v,
                                    type: conftype,
                                    label: label,
                                    value: value,
                                    var: v
                                };
                            }
                            deferred.resolve($self.config);
                        } else if (type == 'errror') {
                            $self._handleIqError(result, deferred);
                        } else {
                            deferred.reject(result);
                        }
                    });
                }
                return deferred.promise;
            },
            deleteNode: function() {
                var deferred = $q.defer();
                var $self = this;
                User.connection.pubsub.deleteNode($self.id, function(result) {
                    var type = result.getAttribute('type');
                    if (type == 'result') {
                        DeviceService.devices[$self.id] = null;
                        Browser.references[$self.id] = null;
                        deferred.resolve(true);
                    } else if (type == 'error') {
                        $self._handleIqError(result, deferred);
                    } else {
                        deferred.reject("Could not delete node: " + result);
                    }
                });
                return deferred;
            },
            saveFile: function() {},
            subscribe: function() {
                var deferred = $q.defer();
                var $self = this;
                User.connection.pubsub.subscribe($self.id, function(result) {
                    var type = result.getAttribute('type');
                    if (type == 'result') {
                        User.subscribed[$self.id] = true;
                        deferred.resolve(true);
                    } else if (type == 'error') {
                        this._handleIqError(result, deferred);
                    } else {
                        deferred.reject("Could not delete node: " + result);
                    }
                });
                User.connection
                return deferred.promise;
            },
            unsubscribe: function(sbuId) {
                var deferred = $q.defer();
                var $self = this;
                User.connection.pubsub.unsubscribe($self.id, function(result) {
                    var type = result.getAttribute('type');
                    if (type == 'result') {
                        deferred.resolve(true);
                        delete User.subscriptions[$self.id];
                    } else if (type == 'error') {
                        this._handleIqError(result, deferred);
                    } else {
                        deferred.reject("Could not delete node: " + result);
                    }
                });
                return deferred.promise;
            },
            save: function(isRootOrFavorite, selectedId) {
                var deferred = $q.defer();
                deferred.reject("In place");
                return deferred.promise;
            },
            saveMeta: function() {
                return this.saveMeta();
            }
        };
        DeviceService.getDefaultConfig = function() {
                var deferred = $q.defer();
                User.connection.pubsub.getDefaultNodeConfig(function(result) {
                    var type = result.getAttribute('type');
                    if (type == 'result') {
                        var x = result.getElementsByTagName('x');
                        config = [];
                        for (configIndex = 0; configIndex < x[0].childNodes.length; configIndex++) {
                            var field = x[0].childNodes[configIndex];
                            var v = field.getAttribute('var');
                            var conftype = field.getAttribute('type');
                            var label = field.getAttribute('label');
                            var value;
                            if (field.childNodes.length > 0) {
                                value = field.childNodes[0].textContent;
                            } else {
                                value = "";
                            }

                            config.push({
                                var: v,
                                type: conftype,
                                label: label,
                                value: value
                            });
                        }
                        deferred.resolve(config);
                    } else if (type == 'error') {
                        $self._handleIqError(result, deferred);
                    } else {
                        deferred.reject(result);
                    }
                });
                return deferred.promise;
            },
            /**
             * [constructDevice description]
             * @param  {[type]} json [description]
             * @return {[type]}      [description]
             */
            DeviceService.constructDevice = function(id, initialize, reload) {
                var device;
                var deferred = $q.defer();
                var devices = DeviceService.devices;
                if (typeof reload === 'undefined') {
                    reload = false;
                }
                if (initialize || reload) {
                    deferred = $q.defer();
                }
                if (typeof id == 'undefined' || id == '') {
                    if (initialize) {
                        var deferred = $q.defer();
                        deferred.reject("Event node ID not specified.");
                        return deferred.promise;
                    } else {
                        return null;
                    }
                }
                if (typeof devices[id] === 'undefined') {
                    device = new Device(id);
                    device.loaded = false;
                } else {
                    device = devices[id];
                    device.loaded = true;
                    if (!reload) {
                        if (initialize) {
                            deferred.resolve(device);
                            return deferred.promise;
                        } else {
                            return device;
                        }
                    }
                }
                if ((initialize && !device.loaded) || reload) {
                    var deferred = $q.defer();
                    device.init().then(function(result) {
                        device.folders = device.references.children;
                        DeviceService.devices[device.id] = device;
                        deferred.resolve(device);
                    }, function(error) {
                        deferred.reject(error);
                    });
                    return deferred.promise;
                } else if (initialize) {
                    deferred.resolve(device);
                    return deferred.promise;
                }
                return device;
            };
        return DeviceService;
    });
})();