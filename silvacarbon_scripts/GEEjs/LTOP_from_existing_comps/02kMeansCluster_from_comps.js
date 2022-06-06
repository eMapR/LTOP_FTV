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
var ltgee = require('users/emaprlab/broberts:lt_collection_2/LandTrendr.js'); 

/////////////////////Cambodia vector////////////////////////////
//Centers the map on spatial features 
var aoi = ee.FeatureCollection("USDOS/LSIB/2017").filter(ee.Filter.eq('COUNTRY_NA','Laos')).geometry().buffer(5000);
//ee.FeatureCollection("TIGER/2018/States").filterMetadata("NAME","equals","Oregon").geometry().buffer(5000);

Map.centerObject(aoi)
//Map.addLayer(aoi)

////////////////////params//////////////////////////
var startYear = 1987; 
var endYear = 2020;
var folder = "LTOP_Laos_Kmeans_v2_comps" 
var description = "Kmeans_v2_comps"

////////////////////////Landsat Composites///////////////////////////////
var comps = ee.ImageCollection('projects/servir-mekong/regionalComposites').filterBounds(aoi); 

//the rest of the scripts will be easier if we just rename the bands of these composites to match what comes out of the LT modules
//note that if using the SERVIR composites the default will be to get the first six bands without the percentile bands
comps = comps.map(function(img){
  return img.select(['blue','green','red','nir','swir1','swir2'],['B1','B2','B3','B4','B5','B7']); 
}); 

//now make an image that looks like the outputs of the LT modules
var image2020 = comps.filter(ee.Filter.eq('system:index','2020')).first(); 
var image2003 = comps.filter(ee.Filter.eq('system:index','2003')).first(); 
var image1987 = comps.filter(ee.Filter.eq('system:index','1987')).first(); 

var LandsatComposites = image2020.addBands(image2003).addBands(image1987); 

////////////////////SNIC/////////////////////////////
var snicImagery = ee.Algorithms.Image.Segmentation.SNIC({
  image: LandsatComposites,
  size: 10, //changes the number and size of patches 
  compactness: 1, //degrees of irregularity of the patches from a square 
  }).clip(aoi);
  
/////////////////10k sample ////////////////////////////STEP 2
//pull in the subsampled and attributed 75k points
var sample75k = ee.FeatureCollection("users/ak_glaciers/snic_seed_pixels_75k_pts_w_attributes");
Map.addLayer(sample75k); 
print(sample75k.first()); 

////////////////////SNIC/////////////////////////////
var patchRepsMean = snicImagery.select(["seeds", "clusters",  "B1_mean", "B2_mean",  "B3_mean",  "B4_mean",  "B5_mean",  "B7_mean",  "B1_1_mean",  "B2_1_mean",  "B3_1_mean",  "B4_1_mean",  "B5_1_mean","B7_1_mean",  "B1_2_mean",  "B2_2_mean",  "B3_2_mean",  "B4_2_mean",  "B5_2_mean",  "B7_2_mean"]);

var patchRepSeeds = snicImagery.select(['seeds']);

///////Select singel pixel from each patch/////////////
print(patchRepsMean.bandNames())
var SNIC_means_seed = patchRepSeeds.multiply(patchRepsMean).select(["B1_mean", "B2_mean",  "B3_mean",  "B4_mean",  "B5_mean",  "B7_mean",  "B1_1_mean",  "B2_1_mean",  "B3_1_mean",  "B4_1_mean",  "B5_1_mean","B7_1_mean",  "B1_2_mean",  "B2_2_mean",  "B3_2_mean",  "B4_2_mean",  "B5_2_mean",  "B7_2_mean"],["seed__3",  "seed__4",  "seed__5",  "seed__6",  "seed__7",  "seed__8",  "seed__9",  "seed__10",  "seed__11",  "seed__12","seed__13",  "seed__14",  "seed__15",  "seed__16",  "seed__17",  "seed__18",  "seed__19", "seed__20"])//.reproject({  crs: 'EPSG:4326',  scale: 30});//.clip(aoi)
var SNIC_means_image = patchRepsMean.select(["B1_mean", "B2_mean",  "B3_mean",  "B4_mean",  "B5_mean",  "B7_mean",  "B1_1_mean",  "B2_1_mean",  "B3_1_mean",  "B4_1_mean",  "B5_1_mean","B7_1_mean",  "B1_2_mean",  "B2_2_mean",  "B3_2_mean",  "B4_2_mean",  "B5_2_mean",  "B7_2_mean"],["seed__3",  "seed__4",  "seed__5",  "seed__6",  "seed__7",  "seed__8",  "seed__9",  "seed__10",  "seed__11",  "seed__12","seed__13",  "seed__14",  "seed__15",  "seed__16",  "seed__17",  "seed__18",  "seed__19", "seed__20"])//.reproject({  crs: 'EPSG:4326',  scale: 30});//.clip(aoi)
print(SNIC_means_image.bandNames())

/////////////////Train////////////////////////////
var training = ee.Clusterer.wekaCascadeKMeans(5000,5001).train({ 
  features: sample75k, 
  //inputProperties:["B1_mean", "B2_mean",  "B3_mean",  "B4_mean",  "B5_mean",  "B7_mean",  "B1_1_mean",  "B2_1_mean",  "B3_1_mean",  "B4_1_mean",  "B5_1_mean","B7_1_mean",  "B1_2_mean",  "B2_2_mean",  "B3_2_mean",  "B4_2_mean",  "B5_2_mean",  "B7_2_mean"]
  inputProperties:["seed__3",  "seed__4",  "seed__5",  "seed__6",  "seed__7",  "seed__8",  "seed__9",  "seed__10",  "seed__11",  "seed__12","seed__13",  "seed__14",  "seed__15",  "seed__16",  "seed__17",  "seed__18",  "seed__19", "seed__20"]
});
print(training); 

// // // //////////////Clusterer//////////////
var clusterImage = SNIC_means_image.cluster(training).clip(aoi);
var clusterSeed = SNIC_means_seed.cluster(training).clip(aoi);

// //////////////Kmeans cluster Export//////////////
      
// Export.image.toDrive({
//         image:clusterImage, 
//         description: description, 
//         folder: folder, 
//         fileNamePrefix: "LTOP_Oregon_image_", 
//         //region:aoi, 
//         scale:30, 
//         maxPixels: 1e13 
//       })   
  
Export.image.toAsset({
        image:clusterImage, 
        description: description, 
        assetId: "LTOP_Laos_Kmeans_Cluster_Image_comps", 
        region:aoi, 
        scale:30, 
        maxPixels: 1e13 
      });   
      
Export.image.toDrive({
        image:clusterSeed, 
        description: description, 
        folder:folder, 
        fileNamePrefix: "LTOP_Laos_seed_comps", 
        region:aoi, 
        scale:30, 
        maxPixels: 1e13 
      });    
