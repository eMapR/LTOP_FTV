import os 
import sys 
import pandas as pd 
import glob 
import matplotlib.pyplot as plt
import seaborn as sns 
import ast
import numpy as np 

"""This script is used to calculate a weighting scheme based on data collected by eMapr interpreters"""

def calc_weights(fn,vert='rankVscore', AIC='rankAICc', id_col = 'cluster_id', total=720, seed=52): 
	"""Takes the output of interpreters work and calculates weights from pareto curve."""
	df = pd.read_csv(fn)
	#calc weights 
	df['vWeight'] = df[vert]/total#(df[vert]/(df[vert]+df[AIC]))
	df['aicWeight'] = df[AIC]/total#(df[AIC]/(df[AIC]+df[vert]))

	#there's an issue here where interpreters select multiple simple models very often. 
	#this biases the results towards simple models. Randomly select one solution when that happens

	#first randomly shuffle the df and drop the duplicates. This will take the first row but its random because of shuffling. 
	df = df.sample(frac=1,random_state=seed).drop_duplicates(subset=id_col)

	#calculate the median of weights
	vert_med = df['vWeight'].median()
	aic_med = df['aicWeight'].median()

	#check how the users compare 
	vert_groups = df.groupby(['user'])['vWeight'].median()
	aic_groups = df.groupby(['user'])['aicWeight'].median()
	print(vert_groups)
	print(aic_groups)

	return df,vert_med,aic_med

def apply_weights(fn, ids, vert_weight, aic_weight, group_id='paramNum', vert='rankVscore', AIC='rankAICc'): 
	"""Take data from interpreters with all five available options, applies weights and selects top choice. 
	"""
	#this is the full dataset, not just the selected ones as above 
	df = pd.read_csv(fn)
	#we want to get a value for the areas that are nans, replace those with an arbitrary negative num
	df = df.fillna(-1)

	# df['vert_sum'] = df['vert'].apply(lambda x: sum([float(i) for i in ast.literal_eval(x)]))
	# print(df.shape)
	# print(df['vert'].head())

	# test = df.loc[df['vert_sum']==2.0]
	# print('The shape of test is: ', test.shape)
	# print('shape here is: ', df.shape)

	#select only rows that have been done by interpreters 
	df = df.loc[df['cluster_id'].isin(ids)]

	#drop a few cols that are not being used for this step 
	df.drop(columns=['rmse','NRMSE','fitted','orig','year','vert','params','timestamp'],inplace=True)
	
	#apply the weights and create a weighted sum col
	df['weight_sum'] = (df[vert]*vert_weight)+(df[AIC]*aic_weight)
	#pd.set_option("display.max_rows", None, "display.max_columns", None)
	print(df.loc[df['cluster_id']>=3].head(10))
	# #groupby the ids and max of the weighted sum to get the chart selection based on weights 
	# df = df.loc[df.groupby('cluster_id')['weight_sum'].idxmax()]
	
	#create a new col for the chartIndex so its unique when the dfs are combined 
	df['weighted_sel'] = df['chartIndex']
	
	return df[['cluster_id','weight_sum','weighted_sel']] 

def check_agreement(weighted,unweighted): 
	"""Take the weighted model selections (weighted) and the interpreter selections (unweighted)
	and check to see how often they agree.
	"""
	#note that the weighted selection (weighted_sel) from the previous step will necessarily 
	#be duplicated after the next step. ie the interpreters are allowed to pick multiple solutions but 
	#the weighted selection is only allowed to pick one. 
	joined = unweighted.merge(weighted,on='cluster_id',how='inner')
	print('joined shape is: ', joined.shape)
	#add a col to see if the interpreter selection and weighted selection match
	joined['agree'] = np.where(joined['chartIndex']==joined['weighted_sel'],1,0)
	print('joined dfs')
	print(joined.sort_values('cluster_id').head(10))
	
	#there are some instances where the interpreter had multiple selections and one of the weighted ones is right
	#but the others are not. This is based on a boolean col so it should take a true (1) in the case that it exists and otherwise
	#default to false (0)
	df = joined.loc[joined.groupby(['cluster_id'])['agree'].idxmax()]
	
	#check results 
	print('The next one is the test')
	print(df.head(10))
	#just taking the highest vals (agreements in cases where there were more than one selection)
	print(df.shape)
	print('pos are: ', df['agree'].sum())
	print('negatives?')
	print(df.loc[df['agree']==0].shape)
	#check how often the weighted model picks something not chosen by the interpreters
	# df_neg = joined[joined.duplicated('cluster_id', keep=False) == True]
	# print('The overall size is: ',joined.shape)
	# print('The number of misses of duplicates are: ')
	# print(df_neg['cluster_id'].unique().shape)
	# df_neg = df_neg.loc[df_neg['weighted_sel'] == -1]
	# print('the number of misses is: ')
	# print(df_neg.shape)
	# print('The ones that have duplicates look like: ')

	# print(df_neg.sort_values('cluster_id').head(10))
	df_neg = joined.groupby(['cluster_id']).filter(lambda x: len(x['cluster_id'].unique()) > 1)
	
	#df_neg = joined.loc[joined['weighted_sel']==-1]

def visualize_agreements(pos_data,neg_data): 
	pass

def plot_weights(df,vert='vWeight', AIC='aicWeight',hue_c='indice'): 
	fig,(ax1,ax2) = plt.subplots(2,figsize=(6,4))

	sns.histplot(x=vert,
				#y=vert,
				data=df,
				#color='darkgreen', 
				hue=hue_c,
				multiple='stack', 
				ax=ax1, 
				legend=False
				#cumulative=True)
				)
	sns.histplot(x=AIC,
				#y=AIC,
				data=df,
				hue=hue_c,
				#color='darkgreen', 
				ax=ax2, 
				legend=True, 
				multiple='stack', 
				#cumulative=True)
				)
	plt.show()
	plt.close('all')

if __name__ == '__main__':
	

	#this should be a fp to the output of the interpreters work as a csv
	interp_out = "/vol/v1/proj/LTOP_mekong/csvs/00_weighting_scheme/ltop_interpreted_database_v4.csv"
	interp_out_all = "/vol/v1/proj/LTOP_mekong/csvs/00_weighting_scheme/servir_cambodia_ltop_mass_merge_interpreted.csv"

	#print(pd.read_csv(interp_out_all).head(10))
	#calculate new weights, note that the cols are set as default args and should be changed if they change in the csv
	df,weight1,weight2 = calc_weights(interp_out)
	
	print('vert med is: ', weight1)
	print('aic med is: ', weight2)
	#get the ids of plots that have been finished by interpreters 
	fin_ids = df['cluster_id'].unique()
	print('len is: ', len(fin_ids))
	#apply the weights and calculate which model would be selected based on these criteria 
	df_weight = apply_weights(interp_out_all,fin_ids,weight1,weight2)
	
	# #compare the weighted solutions to the interpreter selected solutions
	check_agreement(df_weight,df)

	#visualize
	#plot_weights(ref_data[0])