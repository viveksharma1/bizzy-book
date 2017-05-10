  //var mongodb = require('mongodb');
  var ObjectID = require('mongodb').ObjectID;
exports.getItembyId = function(array,id){
         for(var i=0;i<array.length;i++){
           if(array[i]._id.equals(ObjectID(id)))
           return array[i];
         }
         return null;
    }