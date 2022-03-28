#________________________________________________________________________________________________________________
#	randomDistinctSampleOfKmeansClusterIDs_2.py
#
#	This program takes a SHP file and randomly selects a subset of features. The SHP file is required to have
#	a field called "cluster_id" and this field should have many duplicate values. This field is called on in 
#	the program to select the a sub set of features, and each feature is given a random number in a new field
#	called "rdmNum". Another new field is also created, "rep", which will be asigned a '1' to the feature with
# 	the lowest random value in the "rdmNum" field. Then all the features with a '1' value in the 'rep' field 
#	written to a new SHP file. 
#__________________________________________________________________________________________________________________

import geopandas as gpd
import pandas as pd
import fiona
import os 
import sys
import numpy as np

shp_file_path = "/vol/v1/proj/LTOP_mekong/vectors/02_Kmeans/LTOP_cambodia_1999_cluster_ids.shp"
out_file_path = "/vol/v1/proj/LTOP_mekong/vectors/02_Kmeans/LTOP_cambodia_kmeans_cluster_ids_subsetted.shp"

shp_df = gpd.read_file(shp_file_path)

print(len(shp_df.cluster_id.unique()))
print(shp_df.head())
print(shp_df.columns) 
# # add two new fields to dataframe 
# shp_df['rdmNum'] = 0
# shp_df['rep'] = 0

# # find the min and max value in the cluster_id field.
# cluster_id_max = shp_df['cluster_id'].max()
# cluster_id_min = shp_df['cluster_id'].min()


# list_min_df = []

# for cluster in list(range(int(cluster_id_min), int(cluster_id_max)+1)):

# 	shp_df_temp = shp_df[shp_df['cluster_id'] == cluster]

# 	shp_df_temp["rdmNum"] = np.random.randint(1,1000000000, size=len(shp_df_temp))

# 	shp_df_temp_min = shp_df_temp[shp_df_temp["rdmNum"] == shp_df_temp["rdmNum"].min()]

# 	list_min_df.append(shp_df_temp_min)


# out_gdf = gpd.GeoDataFrame(pd.concat(list_min_df, ignore_index=True))
# out_gdf.to_file(out_file_path)

# # add a random number to each row in a sudsetted dataframe

# #select a subset of the dataframe 

# # add a 1 to the row in the subset with the lowest random number 

# # repeat for each subset 

# # select the row with the 1 value 

# # save that subset of 1s to a shp file
