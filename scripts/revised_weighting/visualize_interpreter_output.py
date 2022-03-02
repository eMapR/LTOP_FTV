import os 
import sys 
import pandas as pd 
import glob 
import matplotlib.pyplot as plt
import seaborn as sns 
import numpy as np 
import random 
import ast 

"""This script is used to calculate a weighting scheme based on data collected by eMapr interpreters"""

def calc_weights(fn,vert='rankVscore', AIC='rankAICc', id_col = 'cluster_id', total=720, seed=52, remove_ids='10.249.247.4'): 
	"""Takes the output of interpreters work and calculates weights from pareto curve."""
	df = pd.read_csv(fn)
	
	#remove Robert's interpretations or another selected user 
	# print(df.dtypes)
	df = df.loc[df['user'] != remove_ids] #field is hardcoded

	#calc weights 
	df['vWeight'] = df[vert]/total#(df[vert]/(df[vert]+df[AIC]))
	df['aicWeight'] = df[AIC]/total#(df[AIC]/(df[AIC]+df[vert]))
	# print(df.dtypes)
	# print(df['vert'].head())
	# print(ast.literal_eval(df['vert'].iloc[0]))
	

	#there's an issue here where interpreters select multiple simple models very often. 
	#this biases the results towards simple models. Randomly select one solution when that happens
	# print(df.head())
	# print(df.shape)
	#first randomly shuffle the df and drop the duplicates. This will take the first row but its random because of shuffling. 
	# df = df.sample(frac=1,random_state=seed).drop_duplicates(subset=id_col)

	#try a solution to the duplicates where instead of randomly selecting one we always take the higher vert score 
	print('The df here looks like: ')
	print(df[[vert,AIC,'cluster_id','user','interperter']])	
	#drop the nans
	df = df[~df['interperter'].isnull()]

	#now we just have the selected values? 
	df = df.loc[df.groupby(id_col)[vert].idxmax()]#df.sort_values(id_col).drop_duplicates(id_col, keep='last')

	print(df.loc[df['cluster_id']==1751])
	print('then after subsetting')
	print(df[[vert,AIC,'cluster_id','user','interperter']])
	df['vert_sum'] = df['vert'].apply(lambda x: sum([float(i) for i in ast.literal_eval(x)]))
	# print(df.shape)
	# print(df['vert'].head())

	# test = df.loc[df['vert_sum']==2.0]
	# print('The shape of test is: ', test.shape)
	# print('shape here is: ', df.shape)
	# print(df.shape)
	# print(df.head())
	# print(df[vert].median())
	# print(df[AIC].median())
	#calculate the median of weights
	vert_med = df['vWeight'].median()
	aic_med = df['aicWeight'].median()

	#check how the users compare
	vert_groups = df.groupby(['user'])['vWeight'].median()
	aic_groups = df.groupby(['user'])['aicWeight'].median()
	# print(vert_groups)
	# print(aic_groups)

	return df,vert_med,aic_med

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
	interp_out = "/vol/v1/proj/LTOP_mekong/csvs/00_weighting_scheme/servir_ltop_4part_frontier_interpretatoins_plot_1750_up_march_1_processed.csv"
	

	#print(pd.read_csv(interp_out_all).head(10))
	#calculate new weights, note that the cols are set as default args and should be changed if they change in the csv
	df,weight1,weight2 = calc_weights(interp_out)
	
	print('vert med is: ', weight1)
	print('aic med is: ', weight2)

	#find the missing ids 
	# df1 = df.drop_duplicates(subset='cluster_id').sort_values('cluster_id')
	# df1['shifted'] = df1['cluster_id']-df1['cluster_id'].shift(1).dropna(inplace=True)

	# print(df1)
	# df1 = df1.loc[df1['shifted'] != 1]
	# print(df1)
	# #visualize
	plot_weights(df)#, vert = 'rankVscore', AIC='rankAICc')