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
var grid_scale = 20000; 
var epsg = 'EPSG:4326'; 
var assets_root = 'users/ak_glaciers/'; 
var assets_child = 'gee_LTOP_conversion'; 
var aoi = ee.FeatureCollection("USDOS/LSIB/2017").filter(ee.Filter.eq('COUNTRY_NA',place)).geometry().buffer(5000);
var pts_per_tile = 50; 
var image_source = 'medoid'; 

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// File Management/////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
//let GEE create a new assets folder for you that will hold all the outputs of this run 
//ee.data.createFolder(assets_root+assets_child); 

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Landsat Composites /////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
var annualSRcollection; 

if (image_source == 'medoid'){

  var image2021 = ltgee.buildSRcollection(2021, 2021, startDate, endDate, aoi, masked).mosaic(); 
  var image2005 = ltgee.buildSRcollection(2005, 2005, startDate, endDate, aoi, masked).mosaic();
  var image1990 = ltgee.buildSRcollection(1990, 1990, startDate, endDate, aoi, masked).mosaic();

//get servir (or other) image composites   
}else if (image_source != 'medoid'){
  
  //get the SERVIR composites
  var yr_images = []; 
  for (var y = startYear;y < endYear+1; y++){
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
  var comps = servir_ic.map(function(img){
    return img.select(['blue','green','red','nir','swir1','swir2'],['B1','B2','B3','B4','B5','B7']);
  }); 
  
  //now make an image that looks like the outputs of the LT modules
  var image2021 = comps.filter(ee.Filter.eq('system:index','2021')).first();
  var image2005 = comps.filter(ee.Filter.eq('system:index','2005')).first();
  var image1990 = comps.filter(ee.Filter.eq('system:index','1990')).first();
  }
var LandsatComposites = image2021.addBands(image2005).addBands(image1990); 

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Call the functions /////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
// 1. run the snic algorithm 
var snic_output01 = ltop.snic01(LandsatComposites,aoi,grid_scale,epsg,pts_per_tile); 

Export.table.toAsset({
              collection: snic_output01.get(0), 
              description:"LTOP_snic_pts_"+place+"_c2_mapped_per_tile_"+str_start, 
              assetId:assets_child+"/LTOP_snic_pts_"+place+"_c2_mapped_tile_"+str_start, 
              
  }); 
  
Export.image.toAsset({
              image: snic_output01.get(1), 
              description:"LTOP_snic_imagery_"+place+"_c2_mapped_tile_"+str_start, 
              assetId:assets_child+"/LTOP_snic_imagery_"+place+"_c2_mapped_tile_"+str_start, 
              region:aoi, 
              scale:30,
              maxPixels:1e13, 
  }); 
