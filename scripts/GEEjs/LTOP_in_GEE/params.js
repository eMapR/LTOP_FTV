//######################################################################################################## 
//#                                                                                                    #\\
//#                                   LandTrendr Optimization Paramater File                           #\\
//#                                                                                                    #\\
//########################################################################################################

exports = {
  version:'0.0.1',
  place:'servir_comps_revised',
  startYear:1990,
  endYear:2021,
  seedSpacing:10, 
  randomPts:20000,
  imageSource:'servir', 
  assetsRoot:'users/ak_glaciers/',
  assetsChild:'LTOP_servir_troubleshooting', //this is updated from 01,02,03 to 04
  aoi:ee.FeatureCollection("projects/servir-mekong/hydrafloods/CountryBasinsBuffer").geometry(),
  maxClusters:5000,
  minClusters:5000,
  //this has to be uploaded from a local directory and changed 
  abstract_image_pts:ee.FeatureCollection('users/ak_glaciers/servir_comps_revised_workflow/abstract_image_ids_revised_ids'),
  selectedLTparams:ee.FeatureCollection('users/ak_glaciers/servir_comps_revised_workflow/LTOP_servir_comps_revised_kmeans_pts_config_selected_for_GEE_upload_new_weights_gee_implementation'),
  
  //only needed for medoid composites
  startDate:'11-20',
  endDate:'03-10',
  masked:['cloud', 'shadow']

}; 