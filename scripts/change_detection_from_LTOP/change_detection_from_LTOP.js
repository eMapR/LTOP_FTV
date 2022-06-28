//######################################################################################################## 
//#                                                                                                    #\\
//#                      LANDTRENDR CHANGE DETECTION USING OPTIMIZATION OUTPUTS                        #\\
//#                                                                                                    #\\
//########################################################################################################

// date: 2022-02-18
// author: Ben Roberts-Pierel | robertsb@oregonstate.edu
//         Peter Clary        | clarype@oregonstate.edu
//         Robert Kennedy     | rkennedy@coas.oregonstate.edu
// website: https://github.com/eMapR/LT-GEE


//  This program takes seven inputs:
// 1. The LT-like output that is the result of the 06lt_TransferFTV.js script
// 2. LandTrendr.js modules, this is where we get the change detection code from for making maps 
// 3. Start year, this should be the first year in your image stack 
// 4. End year, this should be the final year of your image stack 
// 5. Change detection paramaters- see https://emapr.github.io/LT-GEE/ui-applications.html#ui-landtrendr-change-mapper and 
//    https://emapr.github.io/LT-GEE/api.html#getchangemap for more information 

////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
// #####################################################################################
// ########## Script to implement annual change detection processing
// #####################################################################################

//get the data inputs 
// date: 2022-02-03
// author: Ben Roberts-Pierel | robertsb@oregonstate.edu
//         Peter Clary        | clarype@oregonstate.edu
//         Robert Kennedy     | rkennedy@coas.oregonstate.edu
// website: https://github.com/eMapR/LT-GEE

//  This program takes eleven inputs:
// 1.  An aoi of your study area
// 2.  The cluster image from the Kmeans process. This was an input for the 05lt_Optimum_Imager.js script 
// 3.  The selected LandTrendr params from the LTOP process that was also used in the 05lt_Optimum_Imager.js script. This should line up with the kmeans clusters.
// 4.  The image that is the output of the 05lt_Optimum_Imager.js script. This should be an array image with all the breakpoints (vertices) (up to the maxSegments specified).
// 5.  Image stack that you want to apply the breakpoints to (fit). This script was written with SERVIR composites in mind. 
// 6.  Modules from LandTrendr.js public script
// 7.  Start year, this should be the first year in your image stack 
// 8.  End year, this should be the last year in your image stack 
// 9.  LTOP band - this is kind of clunky but you just need to define a band name that is in line with the naming convention of the breakpoints image but does not 
//     exist in that image. This could be automated as well. 
// 10. Min obvs for the LandTrendr fit algorithm. This needs to be less than the number of images in the stack 
// 11. export band, this is the band (or index) from the SERVIR composites that you want to manipulate and export at the end of the script. Available bands are still in 
//     flux as of 2/18/2022 but they can be viewed in the second section below. 
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////

//USER DEFINED INPUTS/PARAMS
var startYear = 1990; 
var endYear = 2021; 
var place = 'Cambodia'; 
var min_obvs = 11;  
var startDay = '11-20'; 
var endDay =   '03-10';
var maskThese = ['cloud','shadow', 'snow']; 
var index = "NBR" ;
var ftvList = ['NBR'];
var startYearStr = '1990'; 

//inputs and user specified args (NOTE: change the geometry we're clipping to, currently just set up as a test)
var aoi = ee.FeatureCollection("USDOS/LSIB/2017").filter(ee.Filter.eq('COUNTRY_NA',place)).geometry().buffer(5000);
//kmeans cluster image
var cluster_image = ee.Image("users/ak_glaciers/ltop_snic_seed_points75k_kmeans_cambodia_c2_1990"); 
//selected LT params
var table = ee.FeatureCollection("users/ak_glaciers/LTOP_Cambodia_config_selected_220_kmeans_pts_new_weights");
//vertices image from LTOP
var lt_vert = ee.Image("users/ak_glaciers/Optimized_LT_1990_start_Cambodia_remapped_cluster_ids").clip(aoi);
//import modules
var ltgee = require('users/emaprlab/public:Modules/LandTrendr.js'); 
var ftv_prep = require('users/emaprlab/broberts:LTOP_mekong/06lt_Transfer_FTV_modules.js'); 

////////////////////////////////////////////////////////////////////////////////////////////////////
//now prep the imageCollection and the LT breakpoints from the LTOP process
// Load in the Image Collection
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

//add other indices and the fitting index 
annualSRcollection = annualSRcollection.map(function(img){
var b3   = ltgee.calcIndex(img, 'B3', 0); 
var b4   = ltgee.calcIndex(img, 'B4', 0); 
var b5   = ltgee.calcIndex(img, 'B5', 1);
var b7   = ltgee.calcIndex(img, 'B7', 0);
var tcw  = ltgee.calcIndex(img, 'TCW', 1);
var tca  = ltgee.calcIndex(img, 'TCA', 1);
var ndmi = ltgee.calcIndex(img, 'NDMI', 0);
var nbr  = ltgee.calcIndex(img, 'NBR', 0);
var ndvi = ltgee.calcIndex(img, 'NDVI', 0);
return nbr.addBands(b3)
          .addBands(b4)
          .addBands(b5)
          .addBands(b7)
          .addBands(tcw)
          .addBands(tca)
          .addBands(ndmi)
          .addBands(ndvi)
          .set('system:time_start', img.get('system:time_start'));

}); 
print(annualSRcollection, 'medoid composites'); 

//next the breakpoints, these are from the LTOP process
var breakpoints = ftv_prep.prepBreakpoints(lt_vert); 
///////////////////////////////////////////////////////////////////////////////////////////////////////
//now do the actual LandTrendr work
//run lt fit 
var lt_fit_output = ftv_prep.runLTfit(table,annualSRcollection,breakpoints,cluster_image,min_obvs); 
//it seems like the outputs of lt-fit name their bands XXX_fit while runLT does ftv_XXX_fit. I **think** these are the same thing, just w/ diff names?
// var band_names = lt_fit_output.bandNames(); 
// var new_names = band_names.map(function(nm){
//   nm = ee.String(nm); 
//   return (ee.String('ftv_').cat(nm)).toLowerCase(); 
// }); 

// lt_fit_output = lt_fit_output.select(band_names,new_names); 
var lt_like_output = ftv_prep.convertLTfitToLTprem(lt_fit_output,'NBR_fit',startYear,endYear); 

//now do the change detection 
var startYear = 1990; 
var endYear = 2021; 
var export_index = 'NBR'; 
//change detection params 
var changeParams = {
  delta:  'loss',
  sort:   'greatest',
  year:   {checked:false, start:2000, end:2020},
  mag:    {checked:false, value:150,  operator:'>'},
  dur:    {checked:true, value:4,    operator:'<'},
  preval: {checked:false, value:300,  operator:'>'},
  mmu:    {checked:false, value:1},
};

///////////////////////////////////////////////////////////////////////////////////
//make a change detection map using the LandTrendr modules 

//this is an issue because we used different fitting indices and so the changeParams are adjusted according to that...
// var index = 'B5';

// add index to changeParams object
changeParams.index = 'NBR';

// get the change map layers
var changeImg = ltgee.getChangeMap(lt_like_output, changeParams);

///////////////////////////////////////////////////////////////////////////////////
// set visualization dictionaries
var palette = ['#9400D3', '#4B0082', '#0000FF', '#00FF00', '#FFFF00', '#FF7F00', '#FF0000'];
var yodVizParms = {
  min: startYear,
  max: endYear,
  palette: palette
};

var magVizParms = {
  min: 1,
  max: 400,
  palette: ['#ffaa99', '#550000']
};

var durVizParms = {
  min: 1,
  max: 10,
  palette: ['#ff0000', '#999900', '#0044ee']
};

///////////////////////////////////////////////////////////////////////////////////
//Export the image outputs 
var exportIndex = 'NBR'; 
var exportImg = changeImg; 
// Export.image.toDrive({
//   image:exportImg, 
//   description:exportIndex+'_change_detection_img_all_bands', 
//   folder:'LTOP_reem_change_detection',
//   fileNamePrefix:'NBR_change_detection_img_all_bands', 
//   region:geometry3, 
//   scale:30, 
//   crs:'EPSG:4326'
// }); 

Export.image.toAsset({
  image: exportImg, 
  description:exportIndex+'_change_detection_img_'+index, 
  assetId:'reem_cf_outputs/LTOP_'+exportIndex+'_change_detection_img_'+index, 
  region:aoi, 
  scale:30, 
  maxPixels:1e13
}); 
