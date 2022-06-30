//######################################################################################################## 
//#                                                                                                    #\\
//#                              LT vertex-based change detection                               #\\
//#                                                                                                    #\\
//########################################################################################################
//get the data inputs 
// date: 2022-02-03
// author: Ben Roberts-Pierel | robertsb@oregonstate.edu
//         Peter Clary        | clarype@oregonstate.edu
//         Robert Kennedy     | rkennedy@coas.oregonstate.edu
// website: https://github.com/eMapR/LT-GEE

//Notes on inputs: 
// 1.  cluster_image - this was one of the outputs of the 02 kmeans script and an input for the 05lt_Optimum_Imager.js script 
// 2.  table - the selected LandTrendr params from the LTOP process that was also used in the 05lt_Optimum_Imager.js script. This should be from the same run as the previous arg.
// 3.  lt_vert - the image that is the output of the 05lt_Optimum_Imager.js script. This should be an array image with all the breakpoints (vertices) (up to the maxSegments specified).
// 4. export band - this is the band (or index) from the SERVIR composites that you want to manipulate and export at the end of the script. 
// 5. comps_source - this is just used for naming purposes
// 6. vertex_output - passing 'fill' or another string to the fillSegmentYear function will output segment lengths
//    passing an empty list will yield the year of the closest segment
// 7. asset_folder - this is a folder in your asssets directory where you want the outputs to end up
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
//import modules
var ltgee = require('users/emaprlab/public:Modules/LandTrendr.js'); 
var ftv_prep = require('users/emaprlab/broberts:LTOP_mekong/06lt_Transfer_FTV_modules.js'); 

//USER DEFINED INPUTS/PARAMS
var aoi = ee.FeatureCollection("USDOS/LSIB/2017").filter(ee.Filter.eq('COUNTRY_NA','Cambodia')).geometry().buffer(5000);
//kmeans cluster image
var cluster_image = ee.Image("users/ak_glaciers/ltop_snic_seed_points75k_kmeans_cambodia_c2_1990"); 
//selected LT params
var table = ee.FeatureCollection("users/ak_glaciers/LTOP_Cambodia_config_selected_220_kmeans_pts_new_weights");
//vertices image from LTOP
var lt_vert = ee.Image("users/ak_glaciers/Optimized_LT_1990_start_Cambodia_remapped_cluster_ids").clip(aoi);

var startYear = 1990; 
var endYear = 2021; 
var place = 'Cambodia'; 
var min_obvs = 11;  
var export_band = 'NBR_fit'; 
var comps_source = 'servir'; 
var vertex_output = 'fill'; 
var asset_folder = 'reem_cf_outputs'; 

////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
//prep input composites

//first the composites 
var yr_images = []; 
for (var y = 1990;y < 2022; y++){
  var im = ee.Image("projects/servir-mekong/composites/" + y.toString()); 
  yr_images.push(im); 
}

//create a servir composites ic
var servir_ic = ee.ImageCollection.fromImages(yr_images).filterBounds(aoi); 

//make a couple of changes to the servir composites to make them easier to use below 

//it seems like there is an issue with the dates starting on January 1. This is likely the result of a time zone difference between where 
//the composites were generated and what the LandTrendr fit algorithm expects from the timestamps. 
servir_ic = servir_ic.map(function(img){
  var date = img.get('system:time_start'); 
  return img.set('system:time_start',ee.Date(date).advance(6,'month').millis()); 
}); 

//rename the first seven bands to match the expectations for LandTrendr.js to calculate indices. NOTE that this gets rid of the other bands which are the quartiles and thermal 
servir_ic = servir_ic.select(['blue','green','red','nir','swir1','swir2'],['B1','B2','B3','B4','B5','B7']); 

//the servir composites just have Landsat like bands. We want to be able to calculate indices also so add those before we apply the LandTrendr fit algorithm
//a 1 flips the index and a 0 does not
servir_ic = servir_ic.map(function(img){
var b5   = ltgee.calcIndex(img, 'B5', 1);
var b7   = ltgee.calcIndex(img, 'B7', 0);
var tcw  = ltgee.calcIndex(img, 'TCW', 1);
var tca  = ltgee.calcIndex(img, 'TCA', 1);
var ndmi = ltgee.calcIndex(img, 'NDMI', 0);
var nbr  = ltgee.calcIndex(img, 'NBR', 0);
var ndvi = ltgee.calcIndex(img, 'NDVI', 0);
return b5.addBands(b7)
        .addBands(tcw)
        .addBands(tca)
        .addBands(ndmi)
        .addBands(nbr)
        .addBands(ndvi)
        .set('system:time_start', img.get('system:time_start'));

}); 

//next the breakpoints, these are from the LTOP process
var breakpoints = ftv_prep.prepBreakpoints(lt_vert); 

///////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////
//the outputs of the LTOP workflow consist mostly of an array image of LT breakpoints. We use LT fit to generate
//fitted outputs from those breakpoints using the included composites. These things are based on the functions included in 
//the ftv_prep script which is imported at the beginning of this script. 

//run lt fit 
var lt_fit_output = ftv_prep.runLTfit(table,servir_ic,breakpoints,cluster_image,min_obvs); 

//create a 4xn array to mimic the outputs of a normal LT run 
var lt_output = ftv_prep.convertLTfitToLTprem(lt_fit_output,export_band,startYear,endYear); 

///////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////
//now we want to calculate the time since the last vertex and the length of a segment
//first we make an array image that has the year of the segment that year belongs to
//note that this assumes the input is not missing any years and is based on some code from Yang that infills missing years
 
function backwardsDifference(array) {
  var right = array.arraySlice(0, 0, -1); 
  var left = array.arraySlice(0, 1); 
  return left.subtract(right); 
}

function fillSegmentYear(ltResult, startYear, endYear, fillYears) {
  var array = ltResult.select('LandTrendr');
  var allYears = ee.List.sequence(startYear, endYear);
  
  //extract year, ftv, and vertex
  var years = array.arraySlice(0, 0, 1).arrayProject([1]);
  var mask = array.arraySlice(0, 3).arrayProject([1]);

  // Mask off the non-breakpoint values.
  var mYears = years.arrayMask(mask); //this will look like LTOP output, array of vertex yrs of variable length
  //make a selection for the segment length
  var segmentLengths = backwardsDifference(mYears); 
  // Some constants per pixel.
  var lastYear = mYears.arrayGet([-1]); //this should always be the last year in the time series
  var size = mYears.arrayLength(0); //this will be variable with the number of vertex years 

  var result = allYears.map(function(year) {
    year = ee.Image.constant(year); 
    // Find which segement this year belongs to.
    var index = mYears.gt(year).arrayArgmax().arrayGet([0]); 
    
    // Clamp values beyond the last year to the last segment.
    index = index.where(lastYear.lte(year), size.subtract(1)); 
    //now just use the index that's calculated to segment mYears and get the segment year 
    var out = ee.Algorithms.If(fillYears,
    segmentLengths.arrayGet(index.subtract(1)),
    mYears.arrayGet(index.subtract(1))
    ); 
    
    return ee.Image(out); 
  }); 
  
  return ee.ImageCollection(result).toArrayPerBand(0); 
  
}

var bandNames = ee.List.sequence(startYear,endYear); 
bandNames = bandNames.map(function(bn){
  //create a band name that doesn't start with a number
  return ee.String('yr_').cat(ee.Number(bn).toInt().format()); 
}); 

//passing 'fill' or another string to the fillSegmentYear function will output segment lengths
//passing an empty list will yield the year of the closest segment 
var segmentLength = fillSegmentYear(lt_output, 1990, 2021,vertex_output); 
Map.addLayer(segmentLength,{},'segment length'); 

Export.image.toAsset({
  image:segmentLength.arrayFlatten([bandNames]).toInt16(), 
  description:'LTOP_annual_segment_length_'+place, 
  assetId:asset_folder+'/LTOP_annual_segment_length_Cambodia', 
  region:aoi, 
  scale:30, 
  maxPixels:1e13
  
}); 
//////////////////////////////////////////////////////////////////////////////////////
//now we want to calculate the time since the last vertex - this is currently set as more of a time to 
//this could be changed but we'd need to change so that the value is based on the segment start instead of segment end 
var timeSince = years.subtract(fillSegmentYear(lt_output, 1990, 2021,[])); 
Map.addLayer(timeSince,{},'time since');

var timeSinceImg = timeSince.arrayFlatten([bandNames]);
timeSinceImg = timeSinceImg.toInt16();

Export.image.toAsset({
  image:timeSinceImg, 
  description:'LTOP_annual_time_since_vertex_'+export_band+'_'+place, 
  assetId:asset_folder+'/LTOP_annual_time_since_vertex_'+export_band+'_'+place, 
  region:aoi, 
  scale:30, 
  maxPixels:1e13
  
}); 
