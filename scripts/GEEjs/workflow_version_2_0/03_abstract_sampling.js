//######################################################################################################## 
//#                                                                                                    #\\
//#                               Step 3 LandTrendr Optimization workflow                              #\\
//#                                                                                                    #\\
//########################################################################################################

// date: 2020-12-10
// author: Peter Clary        | clarype@oregonstate.edu
//         Robert Kennedy     | rkennedy@coas.oregonstate.edu
//         Ben Roberts-Pierel | robertsb@oregonstate.edu
// website: https://github.com/eMapR/LT-GEE

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Import modules /////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////

var ltgee = require('users/emaprlab/public:Modules/LandTrendr.js'); 
var ltop = require('users/emaprlab/broberts:LTOP_mekong/LTOP_modules')

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Time, space and masking params /////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
//these date windows are specific to the place that you're working on
var startDate = '11-20'; 
var endDate =   '03-10'; 
var masked = ['cloud', 'shadow']; //powermask?? its new and has magic powers ... RETURN TO THIS AND ADD MORE DETAIL
var str_start = '1990'; 
var place = 'Cambodia'; 
var startYear = 1990; 
var endYear = 2021; 
var assets_root = 'users/ak_glaciers/'; 
var assets_child = 'gee_LTOP_conversion'; 
var aoi = ee.FeatureCollection("USDOS/LSIB/2017").filter(ee.Filter.eq('COUNTRY_NA',place)).geometry().buffer(5000);
var image_source = 'medoid'; 

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
  var yr_images = []; 
  for (var y = 1990;y < 2022; y++){
    var im = ee.Image("projects/servir-mekong/composites/" + y.toString()); 
    yr_images.push(im); 
    
  }

  var servir_ic = ee.ImageCollection.fromImages(yr_images); 
  
  //it seems like there is an issue with the dates starting on January 1. This is likely the result of a time zone difference between where 
  //the composites were generated and what the LandTrendr fit algorithm expects from the timestamps. 
  servir_ic = servir_ic.map(function(img){
    var date = img.get('system:time_start'); 
    return img.set('system:time_start',ee.Date(date).advance(6,'month').millis()); 
  }); 
  
  //the rest of the scripts will be easier if we just rename the bands of these composites to match what comes out of the LT modules
  //note that if using the SERVIR composites the default will be to get the first six bands without the percentile bands
  var annualSRcollection = servir_ic.map(function(img){
    return img.select(['blue','green','red','nir','swir1','swir2'],['B1','B2','B3','B4','B5','B7']);
  });
}

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Call the functions /////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
//3. create some abstract images - NOTE this is split into two because there is a process that still has to take place in Python 
var abstract_output03_1 = ltop.abstractSampler03_1(annualSRcollection,
                                                ee.FeatureCollection(assets_root+assets_child+'/LTOP_'+place+'_kmeans_stratified_random_cluster_points_new_workflow_mapped'),
                                                startYear, 
                                                endYear); 
// Export the points
Export.table.toDrive({
  collection: abstract_output03_1, 
  description: "LTOP_"+place+"_Abstract_Sample_annualSRcollection_NBRTCWTCGNDVIB5_c2_"+str_start+"_start_renamed", 
  fileNamePrefix: "LTOP_"+place+"_Abstract_Sample_annualSRcollection_NBRTCWTCGNDVIB5_c2_"+str_start+"_start_renamed", 
  folder:place+'_abstract_images',
  fileFormat: 'csv'
});