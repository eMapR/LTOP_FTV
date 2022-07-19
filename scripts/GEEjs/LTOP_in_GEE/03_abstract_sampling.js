var geometry = 
    /* color: #d63000 */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[104.05223485948095, 14.010262376815325],
          [104.05223485948095, 12.791948747380491],
          [106.73289892198095, 12.791948747380491],
          [106.73289892198095, 14.010262376815325]]], null, false);

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

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Time, space and masking params /////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
var place = 'Cambodia'; 
var startYear = 1990; 
var endYear = 2021; 
var assets_root = 'users/ak_glaciers/'; 
var assets_child = 'servir_training_tests'; 
var aoi = ee.FeatureCollection("USDOS/LSIB/2017").filter(ee.Filter.eq('COUNTRY_NA',place)).geometry().buffer(5000);
var image_source = 'servir'; 

//if you are going to use medoid composites only
//these date windows are specific to the place that you're working on
var startDate = '11-20'; 
var endDate =   '03-10'; 
var masked = ['cloud', 'shadow']; //powermask?? its new and has magic powers ... RETURN TO THIS AND ADD MORE DETAIL

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// File Management/////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
//let GEE create a new assets folder for you that will hold all the outputs of this run 
// ee.data.createFolder(assets_root+assets_child) 

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
                                                ee.FeatureCollection(assets_root+assets_child+'/LTOP_'+place+'_kmeans_stratified_random_cluster_points_'),
                                                startYear, 
                                                endYear); 

var str_start = ee.Number(startYear).format().getInfo(); 

// Export the points
Export.table.toDrive({
  collection: abstract_output03_1, 
  description: "LTOP_"+place+"_Abstract_Sample_annualSRcollection_NBRTCWTCGNDVIB5_c2_"+str_start+"_start_renamed", 
  fileNamePrefix: "LTOP_"+place+"_Abstract_Sample_annualSRcollection_NBRTCWTCGNDVIB5_c2_"+str_start+"_start_renamed", 
  folder:place+'_abstract_images',
  fileFormat: 'csv'
});