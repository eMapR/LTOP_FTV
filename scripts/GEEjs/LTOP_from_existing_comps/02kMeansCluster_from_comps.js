//######################################################################################################## 
//#                                                                                                    #\\
//#                                         LANDTRENDR LIBRARY                                         #\\
//#                                                                                                    #\\
//########################################################################################################


// date: 2020-12-10
// author: Peter Clary    | clarype@oregonstate.edu
//         Robert Kennedy | rkennedy@coas.oregonstate.edu
// website: https://github.com/eMapR/LT-GEE

//////////////////Import Modules ////////////////////////////
var ltgee = require('users/emaprlab/public:Modules/LandTrendr.js'); 

//Centers the map on spatial features 
// var aoi = ee.FeatureCollection("USDOS/LSIB/2017").filter(ee.Filter.eq('COUNTRY_NA','Laos')).geometry().buffer(5000);
var place = 'servir_basin'
// var aoi = ee.FeatureCollection("USDOS/LSIB/2017").filter(ee.Filter.eq('COUNTRY_NA','Cambodia')).geometry().buffer(5000); 
var aoi = ee.FeatureCollection("projects/servir-mekong/hydrafloods/CountryBasinsBuffer").geometry()

////////////////////params//////////////////////////
var startYear = 1990; 
var endYear = 2021;

///////////////////////////////////////////////////////////////////
////////////////////////Landsat Composites/////////////////////////
///////////////////////////////////////////////////////////////////
//get the SERVIR composites
var yr_images = []; 
for (var y = 1990;y < 2022; y++){
  var im = ee.Image("projects/servir-mekong/composites/" + y.toString()); 
  yr_images.push(im); 
  
}

var servir_ic = ee.ImageCollection.fromImages(yr_images); 
print(servir_ic,'servir ic'); 

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

var LandsatComposites = image2021.addBands(image2005).addBands(image1990); 

////////////////////SNIC/////////////////////////////
var snicImagery = ee.Algorithms.Image.Segmentation.SNIC({
  image: LandsatComposites,
  size: 10, //changes the number and size of patches 
  compactness: 1, //degrees of irregularity of the patches from a square 
  }).clip(aoi);
  
/////////////////10k sample ////////////////////////////STEP 2
//pull in the subsampled and attributed 75k points
var sample75k = ee.FeatureCollection("users/ak_glaciers/03_snic_75k_selection_w_attributes_c2_servir_basin_comps");
// Map.addLayer(sample75k); 
// print(sample75k.first()); 

////////////////////SNIC/////////////////////////////
var patchRepsMean = snicImagery.select(["seeds", "clusters",  "B1_mean", "B2_mean",  "B3_mean",  "B4_mean",  "B5_mean",  "B7_mean",  "B1_1_mean",  "B2_1_mean",  "B3_1_mean",  "B4_1_mean",  "B5_1_mean","B7_1_mean",  "B1_2_mean",  "B2_2_mean",  "B3_2_mean",  "B4_2_mean",  "B5_2_mean",  "B7_2_mean"]);

var patchRepSeeds = snicImagery.select(['seeds']);

///////Select singel pixel from each patch/////////////
print(patchRepsMean.bandNames())
var SNIC_means_seed = patchRepSeeds.multiply(patchRepsMean).select(["B1_mean", "B2_mean",  "B3_mean",  "B4_mean",  "B5_mean",  "B7_mean",  "B1_1_mean",  "B2_1_mean",  "B3_1_mean",  "B4_1_mean",  "B5_1_mean","B7_1_mean",  "B1_2_mean",  "B2_2_mean",  "B3_2_mean",  "B4_2_mean",  "B5_2_mean",  "B7_2_mean"],["seed_3",  "seed_4",  "seed_5",  "seed_6",  "seed_7",  "seed_8",  "seed_9",  "seed_10",  "seed_11",  "seed_12","seed_13",  "seed_14",  "seed_15",  "seed_16",  "seed_17",  "seed_18",  "seed_19", "seed_20"])//.reproject({  crs: 'EPSG:4326',  scale: 30});//.clip(aoi)
var SNIC_means_image = patchRepsMean.select(["B1_mean", "B2_mean",  "B3_mean",  "B4_mean",  "B5_mean",  "B7_mean",  "B1_1_mean",  "B2_1_mean",  "B3_1_mean",  "B4_1_mean",  "B5_1_mean","B7_1_mean",  "B1_2_mean",  "B2_2_mean",  "B3_2_mean",  "B4_2_mean",  "B5_2_mean",  "B7_2_mean"],["seed_3",  "seed_4",  "seed_5",  "seed_6",  "seed_7",  "seed_8",  "seed_9",  "seed_10",  "seed_11",  "seed_12","seed_13",  "seed_14",  "seed_15",  "seed_16",  "seed_17",  "seed_18",  "seed_19", "seed_20"])//.reproject({  crs: 'EPSG:4326',  scale: 30});//.clip(aoi)
print(SNIC_means_image.bandNames())

/////////////////Train////////////////////////////
var training = ee.Clusterer.wekaCascadeKMeans(5001,5001).train({ 
  features: sample75k, 
  //inputProperties:["B1_mean", "B2_mean",  "B3_mean",  "B4_mean",  "B5_mean",  "B7_mean",  "B1_1_mean",  "B2_1_mean",  "B3_1_mean",  "B4_1_mean",  "B5_1_mean","B7_1_mean",  "B1_2_mean",  "B2_2_mean",  "B3_2_mean",  "B4_2_mean",  "B5_2_mean",  "B7_2_mean"]
  inputProperties:["seed_3",  "seed_4",  "seed_5",  "seed_6",  "seed_7",  "seed_8",  "seed_9",  "seed_10",  "seed_11",  "seed_12","seed_13",  "seed_14",  "seed_15",  "seed_16",  "seed_17",  "seed_18",  "seed_19", "seed_20"]
});


// // // //////////////Clusterer////////////////////
var clusterSeed = SNIC_means_image.cluster(training).clip(aoi);
var kmeans_seed = clusterSeed

/////////////////Generate stratified random pts ////
//this is new in this version. We just want to make sure that we get all the kmeans clusters in the output image
var selectKmeansPts = function(img,aoi){
  var kmeans_points = img.stratifiedSample({
  numPoints:1,
  classBand:'cluster',
  region:aoi, 
  scale:30, 
  seed:5,
  geometries:true
})
return kmeans_points
}

var kmeans_pts = selectKmeansPts(clusterSeed,aoi)

// //////////////Kmeans cluster Export//////////////
      
Export.image.toDrive({
        image:kmeans_seed, 
        description: 'LTOP_kmeans_'+place+'_c2_comps', 
        folder:'LTOP_kmeans_'+place+'_1990', 
        fileNamePrefix: "LTOP_kmeans_"+place+"_c2_comps", 
        region:aoi, 
        scale:30, 
        maxPixels: 1e13 
});    


Export.image.toAsset({
            image: clusterSeed, 
            description:"LTOP_snic_seed_points75k_kmeans_"+place+"_c2_comps" , 
            assetId:"LTOP_snic_seed_points75k_kmeans_"+place+"_c2_comps" , 
            region:aoi, 
            scale:30,
            maxPixels:1e13, 
}); 


Export.table.toAsset({
  collection:ee.FeatureCollection(kmeans_pts),
  description:'LTOP_kmeans_stratified_random_points_'+place, 
  assetId:'LTOP_kmeans_stratified_random_points_'+place
});