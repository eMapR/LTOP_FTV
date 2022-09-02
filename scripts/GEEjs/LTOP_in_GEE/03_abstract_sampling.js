//######################################################################################################## 
//#                                                                                                    #\\
//#                               Step 3 LandTrendr Optimization workflow                              #\\
//#                                                                                                    #\\
//########################################################################################################

// date: 2022-09-02
// author: Peter Clary        | clarype@oregonstate.edu
//         Robert Kennedy     | rkennedy@coas.oregonstate.edu
//         Ben Roberts-Pierel | robertsb@oregonstate.edu
// website: https://github.com/eMapR/LT-GEE

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Import modules /////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////

var ltgee = require('users/ak_glaciers/adpc_servir_LTOP:modules/LandTrendr.js'); 
var ltop = require('users/ak_glaciers/adpc_servir_LTOP:modules/LTOP_modules.js'); 
var params = require('users/ak_glaciers/adpc_servir_LTOP:modules/params.js'); 

print('You are currently running version: ',params.version,' of the LTOP workflow'); 

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Landsat Composites /////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
var annualSRcollection; 

//these composites are used for the last two steps and span the full period
if (params.image_source == 'medoid'){
  var annualSRcollection = ltgee.buildSRcollection(startYear, endYear, startDate, endDate, aoi, masked); 

}else if (params.image_source != 'medoid'){
    var annualSRcollection = ltop.buildSERVIRcompsIC(params.startYear,params.endYear); 
}

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Call the functions /////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
//3. create some abstract images - NOTE this is split into two because there is a process that still has to take place in Python 
var abstract_output03_1 = ltop.abstractSampler03_1(annualSRcollection,
                                                ee.FeatureCollection(params.assetsRoot+params.assetsChild+'/LTOP_KMEANS_stratified_points_'+params.maxClusters.toString()+'_max_'+params.minClusters.toString()+'_min_clusters_'+params.place+'_c2_'+params.startYear.toString()),
                                                params.startYear, 
                                                params.endYear); 

// Export the points
Export.table.toDrive({
  collection: abstract_output03_1, 
  description: "LTOP_"+params.place+"_Abstract_Sample_annualSRcollection_NBRTCWTCGNDVIB5_c2_"+params.startYear.toString()+"_start", 
  fileNamePrefix: "LTOP_"+params.place+"_Abstract_Sample_annualSRcollection_NBRTCWTCGNDVIB5_c2_"+params.startYear.toString()+"_start", 
  folder:params.place+'_abstract_images',
  fileFormat: 'csv'
});

