import re,json,sys
# united-name selectors for the core HRA aggregates whose standalone-file frame is stale
SEL={
 'skin': (r'^VH_[MF]_skin$',),
 'heart': (r'^VH_[MF]_(interventricular_septum|left_cardiac_atrium|right_cardiac_atrium|left_ventricle|right_ventricle|papillary_muscle_of_heart_.*|aortic_valve|pulmonary_valve|mitral_valve|tricuspid_valve|coronary_sinus|oblique_vein_of_left_atrium|posterior_vein_of_left_ventricle|left_coronary_artery|left_posterior_descending.*|right_coronary_artery)$',),
 'aorta': (r'^VH_[MF]_(ascending_aorta|aortic_arch|descending_aorta_[ab])$',),
 'inferior-vena-cava': (r'^VH_[MF]_inferior_vena_cava_[ab]$',),
 'trachea': (r'^VH_[MF]_(trachea|tracheal_cartilage)$',),
 'spleen': (r'^VH_[MF]_(.*_of_spleen|.*_surface_of_spleen)$',),
 'thymus': (r'^VH_[MF]_thymus_lobe_[LR]$',),
 'pelvis': (r'^VH_[MF]_(sacrum|coccyx|ilium_.*)$',),
 'brain': (r'^Allen_',),
 'large-intestine': (r'^VH_[MF]_(hepatic_flexure_of_colon|transverse_colon|ascending_colon|vermiform_appendix|descending_colon|ileocecal_valve|caecum|rectum|sigmoid_colon|splenic_flexure_of_colon)$',),
}
def select(names,sid): return [n for n in names if any(re.search(p,n) for p in SEL[sid])]
