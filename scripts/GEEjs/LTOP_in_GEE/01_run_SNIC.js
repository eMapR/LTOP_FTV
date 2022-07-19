//######################################################################################################## 
//#                                                                                                    #\\
//#                              Step 1 LandTrendr Optimization workflow                               #\\
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
var ltop = require('users/emaprlab/public:Modules/LTOP_modules.js'); 

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Time, space and masking params /////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////

var place = 'Cambodia'; 
var startYear = 1990; 
var endYear = 2021; 
var grid_scale = 20000; 
var patch_size = 10; 
var pts_per_tile = 50; 
var image_source = 'servir'; 
var epsg = 'EPSG:4326'; 
var assets_root = 'users/ak_glaciers/'; 
var assets_child = 'servir_training_tests'; 
var aoi = ee.FeatureCollection("USDOS/LSIB/2017").filter(ee.Filter.eq('COUNTRY_NA',place)).geometry().buffer(5000);

//if you are using medoid composites also specify: 
//these date windows are specific to the place that you're working on
var startDate = '11-20'; 
var endDate =   '03-10'; 
var masked = ['cloud', 'shadow']; //powermask?? its new and has magic powers ... RETURN TO THIS AND ADD MORE DETAIL

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Landsat Composites /////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
var annualSRcollection; 

if (image_source == 'medoid'){

  var imageEnd = ltgee.buildSRcollection(2021, 2021, startDate, endDate, aoi, masked).mosaic(); 
  var imageMid = ltgee.buildSRcollection(2005, 2005, startDate, endDate, aoi, masked).mosaic();
  var imageStart = ltgee.buildSRcollection(1990, 1990, startDate, endDate, aoi, masked).mosaic();

//get servir (or other) image composites   
}else if (image_source != 'medoid'){
  
  var comps = ltop.buildSERVIRcompsIC(startYear,endYear); 
  
  //now make an image out of a start, mid and end point of the time series 
  var imageEnd = comps.filter(ee.Filter.eq('system:index','2021')).first();
  var imageMid = comps.filter(ee.Filter.eq('system:index','2005')).first();
  var imageStart = comps.filter(ee.Filter.eq('system:index','1990')).first();
  }
var LandsatComposites = imageEnd.addBands(imageMid).addBands(imageStart); 

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Call the functions /////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
// 1. run the snic algorithm 
var snic_output01 = ltop.snic01(LandsatComposites,aoi,grid_scale,epsg,patch_size,pts_per_tile); 

var str_start = ee.Number(startYear).format().getInfo(); 

Export.table.toAsset({
              collection: snic_output01.get(0), 
              description:"LTOP_SNIC_pts_"+place+"_c2_mapped_per_tile_"+str_start, 
              assetId:assets_child+"/LTOP_SNIC_pts_"+place+"_c2_mapped_tile_"+str_start, 
              
  }); 
  
Export.image.toAsset({
              image: snic_output01.get(1), 
              description:"LTOP_SNIC_imagery_"+place+"_c2_mapped_tile_"+str_start, 
              assetId:assets_child+"/LTOP_SNIC_imagery_"+place+"_c2_mapped_tile_"+str_start, 
              region:aoi, 
              scale:30,
              maxPixels:1e13, 
  }); 

