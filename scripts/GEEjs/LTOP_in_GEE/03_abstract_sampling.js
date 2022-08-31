//######################################################################################################## 
//#                                                                                                    #\\
//#                               Step 3 LandTrendr Optimization workflow                              #\\
//#                                                                                                    #\\
//########################################################################################################

// date: 2022-07-19
// author: Peter Clary        | clarype@oregonstate.edu
//         Robert Kennedy     | rkennedy@coas.oregonstate.edu
//         Ben Roberts-Pierel | robertsb@oregonstate.edu
// website: https://github.com/eMapR/LT-GEE

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Import modules /////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////

var ltgee = require('users/emaprlab/public:Modules/LandTrendr.js'); 
var ltop = require('users/emaprlab/public:Modules/LTOP_modules.js'); 
var params = require('users/ak_glaciers/adpc_servir_LTOP:modules/params.js'); 

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Landsat Composites /////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
var annualSRcollection; 

//these composites are used for the last two steps and span the full period
if (image_source == 'medoid'){
  var annualSRcollection = ltgee.buildSRcollection(startYear, endYear, startDate, endDate, aoi, masked); 

}else if (image_source != 'medoid'){
    var annualSRcollection = ltop.buildSERVIRcompsIC(startYear,endYear); 
}

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Call the functions /////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
//3. create some abstract images - NOTE this is split into two because there is a process that still has to take place in Python 
var abstract_output03_1 = ltop.abstractSampler03_1(annualSRcollection,
                                                ee.FeatureCollection(assets_root+params.assetsChild+'/LTOP_KMEANS_stratified_points_'+params.maxClusters.toString()+'_max_'+params.minClusters.toString()+'_min_clusters_'+params.place+'_c2_'+params.startYear.toString()),
                                                startYear, 
                                                endYear); 

// Export the points
Export.table.toDrive({
  collection: abstract_output03_1, 
  description: "LTOP_"+params.place+"_Abstract_Sample_annualSRcollection_NBRTCWTCGNDVIB5_c2_"+params.startYear.toString()+"_start", 
  fileNamePrefix: "LTOP_"+params.place+"_Abstract_Sample_annualSRcollection_NBRTCWTCGNDVIB5_c2_"+params.startYear.toString()+"_start", 
  folder:place+'_abstract_images',
  fileFormat: 'csv'
});

