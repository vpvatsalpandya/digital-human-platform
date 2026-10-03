"""Curated expected-structure checklist per system for scripts/assets/gap-audit.py.

Each entry is (label, id-base). An id-base matches the manifest ids `base`, `base-l`/`base-r`. A trailing `*`
matches any id that starts with that prefix. A `|` separates alternative bases (any one counts). Entries
marked paired=True need both sides. Status: real (a non-generated structure), schematic (generated only), missing.
The lists are NOT an official standard: they are a hand-picked set of named structures a gross-anatomy
atlas is expected to show (textbook level), chosen to cover the areas the earlier audits flagged. The
Terminologia Anatomica name-match figure in the audit is the separate, indicative measure of the full list.
"""
def L(s): return [tuple(x.strip().split('=', 1)) if '=' in x else (x.strip().replace('-', ' ').capitalize(), x.strip()) for x in s.strip().split('\n') if x.strip()]

CHECK = {
 'Skeletal (bones, teeth, cartilages)': L('''
Frontal bone=frontal-bone
Parietal bone=parietal-bone
Occipital bone=occipital-bone
Temporal bone=temporal-bone
Sphenoid bone=sphenoid-bone
Ethmoid bone=ethmoid-bone
Mandible=mandible
Maxilla=maxilla
Zygomatic bone=zygomatic-bone
Nasal bone=nasal-bone
Lacrimal bone=lacrimal-bone
Palatine bone=palatine-bone
Vomer=vomer
Inferior nasal concha=inferior-nasal-concha-bone|inferior-nasal-concha
Hyoid bone=hyoid-bone
Malleus=malleus
Incus=incus
Stapes=stapes
Atlas (C1)=atlas-c1
Axis (C2)=axis-c2
Cervical vertebra C5=vertebra-c5
Thoracic vertebra T6=vertebra-t6
Lumbar vertebra L3=vertebra-l3
Sacrum=sacrum
Coccyx=coccyx
Manubrium of sternum=manubrium-of-sternum
Body of sternum=body-of-sternum
Xiphoid process=xiphoid-process
Rib 1=first-rib
Rib 12=twelfth-rib
Clavicle=clavicle
Scapula=scapula
Humerus=humerus|bone-humerus
Radius=radius
Ulna=ulna
Scaphoid=scaphoid-bone
Lunate=lunate-bone
Capitate=capitate-bone
First metacarpal=first-metacarpal-bone
Proximal phalanx of thumb=proximal-phalanx-of-first-finger-of-hand
Hip bone=hip-bone
Femur=femur
Patella=patella
Tibia=tibia
Fibula=fibula
Talus=talus
Calcaneus=calcaneus
First metatarsal=first-metatarsal-bone
Distal phalanx of great toe=distal-phalanx-of-first-finger-of-foot
Permanent teeth (28 erupted)=upper-first-molar-tooth
Third molar (wisdom tooth)=upper-third-molar-tooth
Thyroid cartilage=thyroid-cartilage
Cricoid cartilage=cricoid-cartilage
Arytenoid cartilage=arytenoid-cartilage
Corniculate cartilage=corniculate-cartilage
Cuneiform cartilage=cuneiform-cartilage
Epiglottis (cartilage)=epiglottis
Tracheal cartilages=tracheal-cartilages
Costal cartilages=costal-cartilage*
Auricular cartilage=auricular-cartilage
Nasal septal / alar cartilages=nasal-septal-cartilage|major-alar-cartilage|lateral-process-of-nasal-septal-cartilage
Articular cartilage=articular-cartilage*
Intervertebral disc (L4/L5)=intervertebral-disc-l4-l5
Cranial sutures: coronal=coronal-suture
Cranial sutures: sagittal=sagittal-suture
Cranial sutures: lambdoid=lambdoid-suture
Cranial sutures: squamous=squamous-suture
Metopic suture (usually closed in adults)=metopic-suture
Cranial sutures: sphenofrontal / sphenoparietal=sphenofrontal-suture|sphenoparietal-suture
Cranial sutures: occipitomastoid=occipitomastoid-suture
Cranial sutures: frontonasal / frontomaxillary=frontonasal-suture|frontomaxillary-suture
Cranial sutures: zygomatic (temporal, maxillary, frontal)=zygomaticotemporal-suture|zygomaticomaxillary-suture|zygomaticofrontal-suture
'''),
 'Joints, capsules and ligaments': L('''
Glenohumeral joint capsule=articular-capsule-of-glenohumeral-joint
Acromioclavicular joint capsule=articular-capsule-of-acromioclavicular-joint
Sternoclavicular joint capsule=articular-capsule-of-sternoclavicular-joint
Elbow joint capsule=articular-capsule-of-elbow-joint
Radiocarpal (wrist) joint capsule=articular-capsule-of-radiocarpal-joint
Metacarpophalangeal capsules=articular-capsules-of-metacarpophalangeal-joints
Proximal interphalangeal capsules (hand)=articular-capsules-of-proximal-interphalangeal-joints
Hip joint capsule=articular-capsule-of-hip-joint
Knee joint capsule=articular-capsule-of-knee-joint
Talocrural (ankle) joint capsule=talocrural-joint-capsule
Metatarsophalangeal capsules=articular-capsules-of-metatarsophalangeal-joints
Temporomandibular joint capsule=articular-capsule-of-temporomandibular-joint
Sacro-iliac joint capsule=sacroiliac-joint-capsule
Zygapophysial (facet) joint capsule L4/L5=facet-joint-capsule-l4-l5
Atlanto-occipital joint capsule=atlanto-occipital-joint-capsule
Lateral atlanto-axial joint capsule=lateral-atlanto-axial-joint-capsule
Pubic symphysis=pubic-symphysis
Menisci of the knee=medial-meniscus|lateral-meniscus
Anterior cruciate ligament=anterior-cruciate-ligament
Posterior cruciate ligament=posterior-cruciate-ligament
Medial collateral ligament of knee=~tibial-collateral-ligament
Sacrotuberous ligament=sacrotuberous-ligament
Sacrospinous ligament=sacrospinous-ligament
Iliofemoral ligament=~iliofemoral-ligament
Anterior longitudinal ligament=anterior-longitudinal-ligament
Ligamentum flavum=ligamenta-flava|ligamentum-flavum
Supraspinous ligament=supraspinous-ligament
Interosseous membrane of forearm=interosseous-membrane-of-forearm
Glenoid labrum=glenoid-labrum
Thyrohyoid ligaments=lateral-thyrohyoid-ligament
'''),
 'Muscular system, tendons, fascia, bursae': L('''
Trapezius=~part-of-trapezius-muscle
Latissimus dorsi=latissimus-dorsi-muscle
Deltoid=deltoid
Pectoralis major=pectoralis-major
Biceps brachii=biceps-brachii
Triceps brachii (long head)=long-head-of-triceps-brachii
Brachialis=brachialis-muscle
Supraspinatus=supraspinatus-muscle
Infraspinatus=infraspinatus-muscle
Subscapularis=subscapularis-muscle
Rectus abdominis=rectus-abdominis
External oblique=external-abdominal-oblique-muscle
Diaphragm=diaphragm
Psoas major=psoas-major*|psoas-major-muscle
Gluteus maximus=gluteus-maximus-muscle
Rectus femoris=rectus-femoris-muscle
Biceps femoris (long head)=long-head-of-biceps-femoris
Gastrocnemius=gastrocnemius
Tibialis anterior=tibialis-anterior-muscle
Masseter=~part-of-masseter
Temporalis=temporalis-muscle
Sternocleidomastoid=sternocleidomastoid-muscle
Orbicularis oculi=palpebral-part-of-orbicularis-oculi
Levator palpebrae superioris=levator-palpebrae-superioris
Superior rectus (eye)=superior-rectus*|superior-rectus-muscle
Stapedius / tensor tympani=stapedius*|tensor-tympani*
Thyro-arytenoid=thyro-arytenoid*|external-part-of-thyro-arytenoid-muscle
Cricothyroid=straight-part-of-cricothyroid-muscle
Calcaneal (Achilles) tendon=calcaneal-tendon
Quadriceps tendon=quadriceps-tendon
Patellar ligament=patellar-ligament
Distal biceps tendon=distal-biceps-tendon
Triceps tendon=triceps-tendon
Plantar aponeurosis=plantar-aponeurosis
Flexor retinaculum of wrist=flexor-retinaculum-of-wrist
Extensor retinaculum of wrist=extensor-retinaculum-of-wrist
Tendon sheaths (flexor digitorum)=tendon-sheath-of-flexor-digitorum-longus
Iliotibial tract=iliotibial-tract
Thoracolumbar fascia=thoracolumbar-fascia
Linea alba=linea-alba
Subacromial bursa=subacromial-bursa
Prepatellar bursa=subcutaneous-prepatellar-bursa|prepatellar-bursa
Deep fascia: intermuscular septa=lateral-intermuscular-septum-of-arm
'''),
 'Cardiovascular (heart, arteries, veins)': L('''
Heart=heart
Pericardial cavity=pericardial-cavity
Transverse pericardial sinus=transverse-pericardial-sinus
Oblique pericardial sinus=oblique-pericardial-sinus
Right atrium / left atrium=cardiac-atrium
Aortic valve=aortic-valve
Interventricular septum=interventricular-septum
Left coronary artery=left-coronary-artery
Left anterior descending artery=left-anterior-descending-artery|anterior-interventricular-artery
Circumflex artery=circumflex-artery-of-heart|left-circumflex-artery
Right marginal artery=right-marginal-artery
Posterior descending artery=right-posterior-descending-artery|~posterior-descending
Great cardiac vein=great-cardiac-vein
Small cardiac vein=small-cardiac-vein
Anterior cardiac veins=anterior-cardiac-vein
Coronary sinus=coronary-sinus
Sinu-atrial node=sinu-atrial-node
Atrioventricular node=atrioventricular-node
Atrioventricular bundle=atrioventricular-bundle
Left bundle branch=left-bundle-branch
Aorta (arch, thoracic, abdominal)=aortic-arch
Coeliac trunk=coeliac-trunk
Common hepatic artery=common-hepatic-artery
Right hepatic artery=right-hepatic-artery
Cystic artery=cystic-artery
Superior mesenteric artery=superior-mesenteric-artery
Sigmoid arteries=sigmoid-artery-a|sigmoid-arteries
Renal artery=right-renal-artery
Common iliac artery=common-iliac-artery
Internal iliac artery=internal-iliac-artery
Femoral artery=femoral-artery
Popliteal artery=popliteal-artery
Posterior tibial artery=posterior-tibial-artery
Dorsalis pedis artery=dorsalis-pedis-artery|dorsal-artery-of-foot
Plantar arch=plantar-arch
Axillary artery=axillary-artery
Brachial artery=brachial-artery
Radial artery=radial-artery
Ulnar artery=ulnar-artery
Superficial palmar arch=superficial-palmar-arch
Deep palmar arch=deep-palmar-arch
Common palmar digital arteries=common-palmar-digital-arteries
Proper digital arteries (hand)=proper-palmar-digital-arteries
Princeps pollicis artery=princeps-pollicis-artery
Median artery=median-artery
Anterior interosseous artery=anterior-interosseous-artery
Common carotid artery=left-common-carotid-artery|common-carotid-artery
Internal carotid artery=internal-carotid-artery
External carotid artery=external-carotid-artery
Facial artery=facial-artery
Superficial temporal artery=superficial-temporal-artery
Posterior auricular artery=posterior-auricular-artery
Ophthalmic artery=ophthalmic-artery
Central retinal artery=central-retinal-artery
Vertebral artery=vertebral-artery
Basilar artery=basilar-artery
Anterior cerebral artery=anterior-cerebral-artery
Middle cerebral artery=middle-cerebral-artery-m1-segment
Posterior cerebral artery=posterior-cerebral-artery
Anterior communicating artery=anterior-communicating-artery
Posterior communicating artery=posterior-communicating-artery
Labyrinthine artery=labyrinthine-artery
Anterior choroidal artery=anterior-choroidal-artery
Anterior spinal artery=anterior-spinal-artery
Posterior spinal artery=posterior-spinal-artery
Intercostal arteries=posterior-intercostal-arteries
Lumbar arteries=lumbar-arteries
Thoracoacromial artery=thoracoacromial-artery
Deep circumflex iliac artery=deep-circumflex-iliac-artery
Umbilical artery (patent part)=umbilical-artery*
Medial umbilical ligament=medial-umbilical-ligament
Ligamentum arteriosum=ligamentum-arteriosum
Superior vena cava=superior-vena-cava
Inferior vena cava=inferior-vena-cava
Brachiocephalic vein=left-brachiocephalic-vein
Internal jugular vein=internal-jugular-vein
Azygos vein=azygos-vein
Hepatic veins (right / middle / left)=right-hepatic-vein|hepatic-veins
Portal vein and branches=hepatic-portal-vein
Left / right portal branch=right-branch-of-portal-vein
Superior mesenteric vein=superior-mesenteric-vein
Renal vein=left-renal-vein|right-renal-vein
Great saphenous vein=great-saphenous-vein
Cephalic vein=cephalic-vein
Basilic vein=basilic-vein
Dorsal venous arch=dorsal-venous-arch-of-foot
Superior sagittal sinus=superior-sagittal-sinus
Straight sinus=straight-sinus
Internal cerebral vein=internal-cerebral-vein
Great cerebral vein=great-cerebral-vein
Superior ophthalmic vein=superior-ophthalmic-vein
Central retinal vein=central-retinal-vein
Median sacral vein=median-sacral-vein
'''),
 'Nervous system (central and peripheral)': L('''
Brain regions (cortical gyri)=~postcentral-gyrus|~superior-frontal-gyrus
Cerebellum=~of-cerebellum|cerebellar-vermis*
Lateral ventricle=body-of-lateral-ventricle
Third ventricle=third-ventricle
Spinal cord=spinal-cord
Cauda equina=cauda-equina
Meninges=meninges*|dura-mater*|cranial-dura*
Olfactory nerve (I)=olfactory-nerve*
Optic nerve (II)=optic-nerve-ii
Oculomotor nerve (III)=oculomotor-nerve-iii
Trigeminal nerve (V)=trigeminal-nerve-v
Facial nerve (VII)=facial-nerve-vii
Vestibulocochlear nerve (VIII)=vestibulocochlear-nerve-viii
Vagus nerve (X)=vagus-nerve-x
Hypoglossal nerve (XII)=hypoglossal-nerve-xii
Spinal nerves C1-Co1 (31 pairs)=spinal-nerve-c5
Brachial plexus (roots-cords)=roots-of-brachial-plexus
Cervical plexus=cervical-plexus
Lumbar plexus=lumbar-plexus
Sacral plexus=sacral-plexus
Coeliac plexus=coeliac-plexus
Cardiac plexus=cardiac-plexus
Hypogastric plexus=superior-hypogastric-plexus
Median nerve=median-nerve
Ulnar nerve=ulnar-nerve
Radial nerve=radial-nerve
Axillary nerve=axillary-nerve
Musculocutaneous nerve=musculocutaneous-nerve
Femoral nerve=femoral-nerve
Sciatic nerve=sciatic-nerve
Tibial nerve=tibial-nerve
Common fibular nerve=common-fibular-nerve
Sural nerve=sural-nerve
Pudendal nerve=pudendal-nerve
Phrenic nerve=phrenic-nerve
Recurrent laryngeal nerve=recurrent-laryngeal-nerve
Superior laryngeal nerve=superior-laryngeal-nerve
Intercostal nerves=intercostal-nerves
Sympathetic trunk=sympathetic-trunk
Sympathetic ganglia (T/L/S)=thoracic-t5-ganglion
Splanchnic nerves=greater-splanchnic-nerve
Trigeminal ganglion=trigeminal-ganglion
Ciliary ganglion=ciliary-ganglion
Pterygopalatine ganglion=pterygopalatine-ganglion
Otic ganglion=otic-ganglion
Submandibular ganglion=submandibular-ganglion
Geniculate ganglion=geniculate-ganglion
Spinal (dorsal root) ganglion=spinal-ganglion
Supra-orbital nerve=supra-orbital-nerve
Supratrochlear nerve=supratrochlear-nerve
Lacrimal nerve=lacrimal-nerve
Infra-orbital nerve=infra-orbital-nerve
Infratrochlear nerve=infratrochlear-nerve
Zygomaticofacial nerve=zygomaticofacial-nerve
Zygomaticotemporal nerve=zygomaticotemporal-nerve
Auriculotemporal nerve=auriculotemporal-nerve
Mental nerve=mental-nerve
Great auricular nerve=great-auricular-nerve
Lesser occipital nerve=lesser-occipital-nerve
Greater occipital nerve=greater-occipital-nerve*
Transverse cervical nerve=transverse-cervical-nerve
Supraclavicular nerves=medial-supraclavicular-nerve
Cervical cardiac nerves=cervical-cardiac-nerves
Intercostobrachial nerve=intercostobrachial-nerve
Medial cutaneous nerve of arm=medial-brachial-cutaneous-nerve
Lateral femoral cutaneous nerve=lateral-femoral-cutaneous-nerve
Lateral sural cutaneous nerve=lateral-sural-cutaneous-nerve
Inferior gluteal nerve=inferior-gluteal-nerve
Perineal nerve=perineal-nerve
Inferior anal nerve=inferior-anal-nerve
Dorsal nerve of penis=dorsal-nerve-of-penis
Dorsal nerve of clitoris=dorsal-nerve-of-clitoris
Digital nerves (hand)=proper-palmar-digital-branches-of-median-nerve
'''),
 'Sense organs (eye, ear)': L('''
Sclera=sclera
Cornea=cornea
Iris=iris
Lens=lens
Retina / choroid=optic-choroid
Vitreous humour=vitreous-humor
Aqueous humour=aqueous-humor
Ciliary body=ciliary-body
Suspensory ligament of lens=suspensory-ligament-of-lens
Optic nerve=optic-nerve-ii
Extraocular muscle (superior rectus)=superior-rectus*|superior-rectus-muscle
Lacrimal gland=lacrimal-gland
Lacrimal sac / nasolacrimal duct=nasolacrimal-duct
Upper eyelid=upper-eyelid
Lower eyelid=lower-eyelid
Tarsal plates=upper-tarsal-plate
Periorbita=periorbita
Conjunctiva=palpebral-conjunctiva*
Auricle / auricular cartilage=auricular-cartilage
External acoustic meatus=external-acoustic-meatus
Tympanic membrane=tympanic-membrane
Tympanic cavity (middle ear)=tympanic-cavity
Malleus / incus / stapes=malleus
Round window=round-window
Scala tympani=scala-tympani
Scala vestibuli=scala-vestibuli
Cochlear duct=cochlear-duct
Anterior semicircular duct=anterior-semicircular-duct
Lateral semicircular duct=lateral-semicircular-duct
Posterior semicircular duct=posterior-semicircular-duct
Utricle=utricle
Saccule=saccule
Membranous ampullae=anterior-membranous-ampulla
Vestibular nerve / cochlear nerve=vestibular-nerve
Facial nerve in the temporal bone (geniculate ganglion)=geniculate-ganglion
Olfactory epithelium / nasal mucosa=mucosa-of-nasal-cavity
Tongue (taste)=dorsal-tongue
'''),
 'Respiratory': L('''
Trachea=trachea|trachea-core
Main bronchi=left-main-bronchus
Segmental bronchi (e.g. anterior, right)=anterior-segmental-bronchus-of-right-lung-biii
Lung lobes=lung
Pleura=pleura*|parietal-pleura*|serous-membrane*
Pleural cavity=pleural-cavity
Fibrous pericardium=fibrous-pericardium
Larynx: thyroid cartilage=thyroid-cartilage
Vocal fold / vocalis=vocalis|vocal-fold
Larynx: vestibular fold=vestibular-fold
Larynx: posterior cricoarytenoid=posterior-crico-arytenoid-muscle
Epiglottis=epiglottis
Hyoid bone=hyoid-bone
Nasal cavity mucosa=mucosa-of-nasal-cavity
Paranasal sinuses=sinus-of-frontal-bone
Diaphragm=diaphragm
'''),
 'Digestive': L('''
Teeth=upper-first-molar-tooth
Tongue=dorsal-tongue
Parotid gland=parotid-gland
Submandibular gland=submandibular-gland
Sublingual gland=sublingual-gland
Oesophagus=oesophagus
Stomach=stomach
Duodenum=duodenum*|duodenum-descending
Jejunum / ileum=small-intestine|jejunum*|ileum
Caecum / appendix=caecum*|cecum*|vermiform-appendix*|appendix*
Ascending / transverse / descending colon=descending-colon
Sigmoid colon=sigmoid-colon
Rectum=rectum
Anal canal / external anal sphincter=external-anal-sphincter
Liver=liver
Gallbladder=gallbladder
Cystic duct=cystic-duct
Common hepatic duct=common-hepatic-duct
Pancreas=pancreas
Coronary ligament of liver=coronary-ligament-of-liver
Falciform ligament=falciform-ligament*
Omenta / peritoneum=greater-omentum*|omentum*|lesser-omentum*
Mesentery=mesentery
Mesocolons (transverse, sigmoid)=transverse-mesocolon|sigmoid-mesocolon
Lesser omentum=lesser-omentum
Omental bursa (lesser sac)=omental-bursa
Gastrosplenic / splenorenal ligaments=gastrosplenic-ligament|splenorenal-ligament
Round ligament of liver=round-ligament-of-liver
Ligamentum venosum=ligamentum-venosum
'''),
 'Urinary and reproductive': L('''
Kidney=kidney
Renal pyramids / calyces=renal-pyramid*|minor-calyx*|calyx*|renal-calyx*
Ureter=ureter
Urinary bladder=urinary-bladder
Urethra=urethra*|female-urethra
Membranous part of male urethra=membranous-part-of-male-urethra
Navicular fossa of male urethra=navicular-fossa-of-male-urethra
Bulbar part of male urethra=bulbar-part-of-male-urethra
Penile (spongy) part of male urethra=penile-part-of-male-urethra
Bulbourethral gland=bulbourethral-gland
Duct of bulbourethral gland=duct-of-bulbourethral-gland
Rectovesical pouch=rectovesical-pouch
Rectouterine pouch (of Douglas)=rectouterine-pouch
Vesicouterine pouch=vesicouterine-pouch
Retropubic space (of Retzius)=retropubic-space
Breast envelope (fat and glandular tissue)=breast-envelope
Suspensory ligaments of breast (Cooper)=suspensory-ligaments-of-breast
Lactiferous ducts=lactiferous-ducts
Axillary tail of breast=axillary-tail-of-breast
Prostate=prostate
Seminal gland=seminal-gland
Ductus deferens=ductus-deferens
Testis=testis
Epididymis=epididymis
Penis (corpus cavernosum)=corpus-cavernosum-of-penis
Uterus=uterus|fundus-of-uterus
Uterine tube=~uterine-tube
Ovary=ovary
Vagina=vagina
Vestibule of vagina=vestibule-of-vagina
Clitoris (glans, body, crura)=glans-of-clitoris|body-of-clitoris|crus-of-clitoris
Bulb of vestibule=bulb-of-vestibule
Greater vestibular gland=greater-vestibular-gland
Labia minora=labium-minus
Labia majora=labium-majus
Mammary gland=mammary-gland
Uterine artery=~uterine-artery
Ovarian artery / vein=ovarian-artery
Testicular artery=~testicular-artery
Pelvic floor: levator ani=levator-ani*|pubo-analis-muscle|puborectalis*
'''),
 'Lymphatic and endocrine': L('''
Spleen=spleen
Thymus=thymus|left-lobe-of-thymus
Palatine tonsil=palatine-tonsil
Axillary nodes=~axillary-nodes
Inguinal nodes=~inguinal-node
Cervical nodes=deep-anterior-cervical-nodes|supraclavicular-nodes
Mesenteric nodes=superior-mesenteric-nodes|paracolic-superior-mesenteric-nodes
Thoracic duct=thoracic-duct
Thyroid gland=thyroid-gland
Parathyroid glands=~parathyroid
Adrenal gland=adrenal-gland
Pituitary gland=adenohypophysis|neurohypophysis
Pituitary infundibulum (stalk)=pituitary-infundibulum
Pineal gland=pineal*
Pancreas (endocrine part)=pancreas
'''),
 'Skin and layers': L('''
Skin surface=skin
Epidermis=epidermis-shell
Papillary dermis=papillary-dermis-shell
Reticular dermis=dermis-shell
Hypodermis=hypodermis-shell
Membranous layer of subcutaneous tissue=membranous-subcutaneous-shell
Subcutaneous abdominal fat=subcutaneous-abdominal-fat*
Hair (eyebrows, eyelashes, pubic hair)=pubic-hairs
Nails=nail*
Nipple=nipple
Areola=areola
Sweat glands (representative inset)=sweat-gland*
Sebaceous glands (representative inset)=sebaceous-gland*
Hair follicles (representative inset)=hair-follicle*
Arrector pili (representative inset)=arrector*
Breast / mammary gland=mammary-gland
Dermal nerve endings (representative inset)=dermal-nerve-ending*
Dermal capillary loops (representative inset)=dermal-capillary-loop*
'''),
}

# Why something stays missing (shown in the audit); keyed by the label.
REASON = {
 'Breast / mammary gland': 'the HRA female body has a real mammary gland mesh; the nipple, areola, envelope, ducts and ligaments are schematic',
 'Mammary gland': 'no open mesh of the mammary gland in the sources',
}
# Placeholders that are real tissue-level concepts but are drawn as REPRESENTATIVE insets only (category "schematic inset"):
# microscopic skin appendages, about 3x life size at one skin patch; they are not anatomical positions and never counted as real.
NOTE = {
 'Tympanic cavity (middle ear)': 'schematic; hollow envelope around the real ossicles',
 'Pericardial cavity': 'schematic; potential space between heart and fibrous pericardium',
 'Transverse pericardial sinus': 'schematic; small recess of the pericardial cavity',
 'Oblique pericardial sinus': 'schematic; small recess of the pericardial cavity',
 'Omental bursa (lesser sac)': 'schematic; thin pocket behind the stomach',
 'Bulbar part of male urethra': 'schematic; cut from the real urethra centre line',
 'Penile (spongy) part of male urethra': 'schematic; cut from the real urethra centre line',
 'Bulbourethral gland': 'schematic; pea-sized, placed clear of neighbours',
 'Duct of bulbourethral gland': 'schematic',
 'Rectovesical pouch': 'schematic; peritoneal recess, male',
 'Rectouterine pouch (of Douglas)': 'schematic; peritoneal recess, female',
 'Vesicouterine pouch': 'schematic; peritoneal recess, female',
 'Retropubic space (of Retzius)': 'schematic; space behind the pubic symphysis',
 'Breast envelope (fat and glandular tissue)': 'schematic; thin plate under the skin, anchored on the nipple',
 'Suspensory ligaments of breast (Cooper)': 'schematic',
 'Lactiferous ducts': 'schematic; 15 ducts, branching',
 'Axillary tail of breast': 'schematic',
 'Metopic suture (usually closed in adults)': 'schematic; closed in most adults, persists in a minority',
 'Umbilical artery (patent part)': 'schematic; adult remnant: the patent proximal part gives the superior vesical arteries',
 'Medial umbilical ligament': 'schematic; obliterated distal umbilical artery',
 'Pleural cavity': 'schematic; potential space around each lung',
 'Sweat glands (representative inset)': 'representative inset (about 3x life size), not anatomical',
 'Sebaceous glands (representative inset)': 'representative inset, not anatomical',
 'Hair follicles (representative inset)': 'representative inset, not anatomical',
 'Arrector pili (representative inset)': 'representative inset, not anatomical',
 'Dermal nerve endings (representative inset)': 'representative inset, not anatomical',
 'Dermal capillary loops (representative inset)': 'representative inset, not anatomical',
}

# Sex-specific entries are "n/a" on the other body (not counted as missing).
SEX = {}
for _l in ('Uterus','Uterine tube','Ovary','Vagina','Vestibule of vagina','Clitoris (glans, body, crura)','Bulb of vestibule','Greater vestibular gland','Labia minora','Labia majora','Mammary gland','Uterine artery','Ovarian artery / vein','Dorsal nerve of clitoris','Breast / mammary gland','Rectouterine pouch (of Douglas)','Vesicouterine pouch','Breast envelope (fat and glandular tissue)','Suspensory ligaments of breast (Cooper)','Lactiferous ducts','Axillary tail of breast'): SEX[_l] = 'female'
for _l in ('Membranous part of male urethra','Navicular fossa of male urethra','Bulbar part of male urethra','Penile (spongy) part of male urethra','Bulbourethral gland','Duct of bulbourethral gland','Rectovesical pouch','Prostate','Seminal gland','Ductus deferens','Testis','Epididymis','Penis (corpus cavernosum)','Testicular artery','Dorsal nerve of penis'): SEX[_l] = 'male'
