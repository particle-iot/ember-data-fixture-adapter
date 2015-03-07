import Ember from 'ember';
import DS from 'ember-data';
import FixtureAdapter from 'ember-data-fixture-adapter';
import {setupStore, async} from 'dummy/tests/test-helper';
import QUnit from 'qunit';
import {module, test} from 'qunit';

var store, env;
var run = Ember.run;

var Person = DS.Model.extend({
  name: DS.attr('string'),
  cars: DS.hasMany('car')
});

Person.toString = function() { return "Person"; };

var Car = DS.Model.extend({
  make: DS.attr('string'),
  model: DS.attr('string'),
  person: DS.belongsTo('person')
});

Car.toString = function() { return "Car"; };

var manager;

module("integration/record_array_manager- destroy", {
  setup: function() {
    env = setupStore({
      adapter: FixtureAdapter.extend()
    });
    store = env.store;

    manager = store.recordArrayManager;

    env.registry.register('model:car', Car);
    env.registry.register('model:person', Person);
  }
});

function tap(obj, methodName, callback) {
  var old = obj[methodName];

  var summary = { called: [] };

  obj[methodName] = function() {
    var result = old.apply(obj, arguments);
    if (callback) {
      callback.apply(obj, arguments);
    }
    summary.called.push(arguments);
    return result;
  };

  return summary;
}

test("destroying the store correctly cleans everything up", function(assert) {
  var query = { };
  var person;

  run(function() {
    store.push('car', {
      id: 1,
      make: 'BMC',
      model: 'Mini Cooper',
      person: 1
    });
  });

  run(function() {
    person = store.push('person', {
      id: 1,
      name: 'Tom Dale',
      cars: [1]
    });
  });

  var filterd = manager.createFilteredRecordArray(Person, function() { return true; });
  var filterd2 = manager.createFilteredRecordArray(Person, function() { return true; });
  var adapterPopulated = manager.createAdapterPopulatedRecordArray(Person, query);

  var filterdSummary = tap(filterd, 'willDestroy');
  var filterd2Summary = tap(filterd2, 'willDestroy');

  var adapterPopulatedSummary = tap(adapterPopulated, 'willDestroy');

  assert.equal(filterdSummary.called.length, 0);
  assert.equal(adapterPopulatedSummary.called.length, 0);

  assert.equal(filterd2Summary.called.length, 0);

  assert.equal(person._recordArrays.list.length, 2, 'expected the person to be a member of 2 recordArrays');

  Ember.run(filterd2, filterd2.destroy);

  assert.equal(person._recordArrays.list.length, 1, 'expected the person to be a member of 1 recordArrays');

  assert.equal(filterd2Summary.called.length, 1);

  Ember.run(manager, manager.destroy);

  assert.equal(person._recordArrays.list.length, 0, 'expected the person to be a member of no recordArrays');

  assert.equal(filterd2Summary.called.length, 1);

  assert.equal(filterdSummary.called.length, 1);
  assert.equal(adapterPopulatedSummary.called.length, 1);
});


test("Should not filter a stor.all() array when a record property is changed", function(assert) {
  var car;
  var filterdSummary = tap(store.recordArrayManager, 'updateRecordArray');

  store.all('car');

  run(function() {
    car = store.push('car', {
      id: 1,
      make: 'BMC',
      model: 'Mini Cooper',
      person: 1
    });
  });

  assert.equal(filterdSummary.called.length, 1);

  run(function() {
    car.set('model', 'Mini');
  });

  assert.equal(filterdSummary.called.length, 1);

});
