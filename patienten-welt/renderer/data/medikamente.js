/* Medikamentenkatalog (Beispielkatalog, Zusammenstellung Oktober 2026).
   Format je Zeile:  Wirkstoff | ATC-Code | Alias (Handelsnamen, ;-getrennt) | Form:Stärke;Stärke | Form:Stärke ...
   Gemeinsame Einheit am Ende einer Stärkenliste gilt für alle Werte ohne Einheit (z. B. "Tbl:5;10;20 mg").
   Der Katalog ersetzt keine zugelassene Arzneimitteldatenbank (z. B. ABDATA, ifap, Rote Liste); Angaben ohne Gewähr. */
window.MED_CATALOG_RAW = String.raw`
Pantoprazol|A02BC02|Pantozol;Pantoprazol-ratiopharm|MSR-Tbl:20;40 mg
Omeprazol|A02BC01|Antra;Omep|MSR-Kps:10;20;40 mg
Esomeprazol|A02BC05|Nexium|MSR-Tbl:20;40 mg
Lansoprazol|A02BC03|Agopton|MSR-Kps:15;30 mg
Rabeprazol|A02BC04|Pariet|MSR-Tbl:10;20 mg
Famotidin|A02BA03|Pepdul|Tbl:20;40 mg
Sucralfat|A02BX02|Ulcogant|Tbl:1 g
Magaldrat|A02AD02|Riopan|Kautbl:800 mg|Gel:800 mg/10 ml
Metoclopramid|A03FA01|MCP;Paspertin|Tbl:10 mg|Tr:4 mg/ml
Domperidon|A03FA03|Motilium|FTA:10 mg
Butylscopolamin|A03BB01|Buscopan|Drg:10 mg|Sup:10 mg|Inj:20 mg/ml
Simeticon|A03AX13|Sab simplex;Lefax|Kautbl:42 mg|Susp:69,19 mg/ml
Ondansetron|A04AA01|Zofran|FTA:4;8 mg
Loperamid|A07DA03|Imodium|Kps:2 mg|Tbl:2 mg
Mesalazin|A07EC02|Salofalk;Pentasa|MSR-Tbl:500;1000 mg|Sup:500;1000 mg
Nystatin|A07AA02|Moronal;Nystatin Holsten|Susp:100000 I.E./ml
Bisacodyl|A06AB02|Dulcolax|MSR-Tbl:5 mg|Sup:10 mg
Natriumpicosulfat|A06AB08|Laxoberal|Tr:7,5 mg/ml
Lactulose|A06AD11|Bifiteral;Laevolac|Sirup:667 mg/ml
Macrogol|A06AD15|Movicol;Laxbene|Pulver:13,8 g Beutel
Ursodeoxycholsäure|A05AA02|Ursofalk;UDC|Kps:250 mg|FTA:500 mg
Pankreatin|A09AA02|Kreon;Panzytrat|Kps:10000;25000;40000 Lipase-E.
Metformin|A10BA02|Glucophage;Siofor|FTA:500;850;1000 mg
Glimepirid|A10BB12|Amaryl|Tbl:1;2;3;4 mg
Glibenclamid|A10BB01|Euglucon|Tbl:3,5 mg
Repaglinid|A10BX02|NovoNorm|Tbl:0,5;1;2 mg
Acarbose|A10BF01|Glucobay|Tbl:50;100 mg
Pioglitazon|A10BG03|Actos|Tbl:15;30;45 mg
Sitagliptin|A10BH01|Januvia;Xelevia|FTA:25;50;100 mg
Vildagliptin|A10BH02|Galvus|Tbl:50 mg
Saxagliptin|A10BH03|Onglyza|FTA:2,5;5 mg
Linagliptin|A10BH05|Trajenta|FTA:5 mg
Empagliflozin|A10BK03|Jardiance|FTA:10;25 mg
Dapagliflozin|A10BK01|Forxiga|FTA:5;10 mg
Empagliflozin/Metformin|A10BD20|Synjardy|FTA:5/850;5/1000;12,5/850;12,5/1000 mg
Sitagliptin/Metformin|A10BD07|Janumet;Velmetia|FTA:50/850;50/1000 mg
Semaglutid|A10BJ06|Ozempic;Rybelsus|Fertigpen:0,25;0,5;1;2 mg|Tbl:3;7;14 mg
Dulaglutid|A10BJ05|Trulicity|Fertigpen:0,75;1,5;3;4,5 mg
Liraglutid|A10BJ02|Victoza;Saxenda|Fertigpen:6 mg/ml
Tirzepatid|A10BX16|Mounjaro|Fertigpen:2,5;5;7,5;10;12,5;15 mg
Insulin glargin|A10AE04|Lantus;Toujeo;Abasaglar;Semglee|Fertigpen:100 E/ml;300 E/ml
Insulin detemir|A10AE05|Levemir|Fertigpen:100 E/ml
Insulin degludec|A10AE06|Tresiba|Fertigpen:100 E/ml;200 E/ml
Insulin lispro|A10AB04|Humalog;Liprolog;Lyumjev|Fertigpen:100 E/ml;200 E/ml
Insulin aspart|A10AB05|NovoRapid;Fiasp|Fertigpen:100 E/ml
Insulin glulisin|A10AB06|Apidra|Fertigpen:100 E/ml
Humaninsulin|A10AB01|Actrapid;Huminsulin Normal|Fertigpen:100 I.E./ml
Insulin isophan (NPH)|A10AC01|Protaphane;Huminsulin Basal|Fertigpen:100 I.E./ml
Colecalciferol (Vitamin D3)|A11CC05|Vigantol;Dekristol;Vitamin D|Tr:20000 I.E./ml|Kps:1000;2000;4000;20000 I.E.
Calcium|A12AA04|Calcium-Sandoz;Calcium Verla|Brausetbl:500;1000 mg
Magnesium|A12CC30|Magnesium Verla;Magnesiocard;Mg 5-Longoral|Brausetbl:243;300 mg|Kps:150 mg
Kalium|A12BA01|Kalinor;Kalinor-retard|Brausetbl:2,35 g|ret-Kps:600 mg
Natriumhydrogencarbonat|B05XA02|Natron;Bicanorm|Tbl:500 mg
Folsäure|B03BB01|Folsan|Tbl:0,4;5 mg
Cyanocobalamin (Vitamin B12)|B03BA01|Vitamin B12 Hevert;B12 Ankermann|Inj:1000 µg|Tbl:1000 µg
Eisen(II)-sulfat|B03AA07|Ferro-Gradumet;Tardyferon|ret-Tbl:80 mg Fe|Kps:100 mg Fe
Eisen(III)-carboxymaltose|B03AC|Ferinject|Inj:50 mg/ml
Levothyroxin|H03AA01|L-Thyroxin;Euthyrox;Eferox|Tbl:25;50;75;88;100;112;125;137;150;175;200 µg
Thiamazol|H03BB02|Favistan;Thiamazol Henning|Tbl:5;10;20 mg
Prednisolon|H02AB06|Decortin H;Prednisolon-ratiopharm|Tbl:1;5;10;20;50 mg|Sup:100 mg
Prednison|H02AB07|Decortin|Tbl:5;20;50 mg
Methylprednisolon|H02AB04|Urbason;Medrol|Tbl:4;8;16;32 mg
Dexamethason|H02AB02|Fortecortin|Tbl:0,5;1;2;4;8 mg
Hydrocortison|H02AB09|Hydrocortison Hexal;Hydrocutan|Tbl:10;20 mg
Fludrocortison|H02AA02|Astonin H|Tbl:0,1 mg
Glucagon|H04AA01|GlucaGen;GlucaGen HypoKit|Inj:1 mg
Phenprocoumon|B01AA04|Marcumar;Falithrom|Tbl:3 mg
Apixaban|B01AF02|Eliquis|FTA:2,5;5 mg
Rivaroxaban|B01AF01|Xarelto|FTA:2,5;10;15;20 mg
Edoxaban|B01AF03|Lixiana|FTA:15;30;60 mg
Dabigatran|B01AE07|Pradaxa|Kps:75;110;150 mg
Enoxaparin|B01AB05|Clexane;Enoxaparin Inhixa|Fertigspritze:20;40;60;80;100 mg
Dalteparin|B01AB04|Fragmin|Fertigspritze:2500;5000;7500 I.E.
Certoparin|B01AB01|Mono-Embolex|Fertigspritze:3000 I.E.
Acetylsalicylsäure (ASS)|B01AC06|Aspirin;ASS-ratiopharm;ASS Protect|MSR-Tbl:50;100;300 mg
Clopidogrel|B01AC04|Plavix|FTA:75;300 mg
Prasugrel|B01AC22|Efient|FTA:5;10 mg
Ticagrelor|B01AC24|Brilique|FTA:60;90 mg
Tranexamsäure|B02AA02|Cyklokapron|FTA:500 mg
Ramipril|C09AA05|Delix;Vesdil;Ramipril-ratiopharm|Tbl:1,25;2,5;5;10 mg
Enalapril|C09AA02|Xanef;Pres|Tbl:2,5;5;10;20 mg
Lisinopril|C09AA03|Acerbon|Tbl:2,5;5;10;20 mg
Captopril|C09AA01|Lopirin|Tbl:12,5;25;50 mg
Perindopril|C09AA04|Coversum|FTA:2,5;5;10 mg
Candesartan|C09CA06|Atacand|Tbl:4;8;16;32 mg
Valsartan|C09CA03|Diovan|FTA:40;80;160;320 mg
Losartan|C09CA01|Lorzaar|FTA:12,5;25;50;100 mg
Telmisartan|C09CA07|Micardis|Tbl:20;40;80 mg
Irbesartan|C09CA04|Karvea|Tbl:75;150;300 mg
Olmesartan|C09CA08|Votum;Olmetec|FTA:10;20;40 mg
Sacubitril/Valsartan|C09DX04|Entresto|FTA:24/26;49/51;97/103 mg
Ramipril/Hydrochlorothiazid|C09BA05|Delix plus|Tbl:2,5/12,5;5/25 mg
Valsartan/Hydrochlorothiazid|C09DA03|Diovan comp|FTA:80/12,5;160/12,5;160/25 mg
Candesartan/Hydrochlorothiazid|C09DA06|Atacand plus|Tbl:8/12,5;16/12,5 mg
Telmisartan/Hydrochlorothiazid|C09DA07|MicardisPlus|Tbl:40/12,5;80/12,5;80/25 mg
Valsartan/Amlodipin|C09DB01|Exforge|FTA:80/5;160/5;160/10 mg
Amlodipin|C08CA01|Norvasc;Amlodipin-ratiopharm|Tbl:2,5;5;10 mg
Nifedipin|C08CA05|Adalat;Nifehexal|ret-Tbl:20;30;60 mg
Felodipin|C08CA02|Modip|ret-Tbl:2,5;5;10 mg
Lercanidipin|C08CA13|Carmen;Corifeo|FTA:10;20 mg
Verapamil|C08DA01|Isoptin|FTA:40;80;120;240 mg
Diltiazem|C08DB01|Dilzem|Tbl:60;90 mg
Metoprolol|C07AB02|Beloc-Zok;Lopresor;Metoprolol-ratiopharm|ret-Tbl:23,75;47,5;95;190 mg|Tbl:50;100 mg
Bisoprolol|C07AB07|Concor;Bisoprolol-ratiopharm|FTA:1,25;2,5;3,75;5;7,5;10 mg
Nebivolol|C07AB12|Nebilet|Tbl:2,5;5 mg
Carvedilol|C07AG02|Dilatrend|Tbl:3,125;6,25;12,5;25 mg
Atenolol|C07AB03|Tenormin|Tbl:25;50;100 mg
Propranolol|C07AA05|Dociton|FTA:10;40;80 mg
Bisoprolol/Hydrochlorothiazid|C07BB07|Concor plus|FTA:5/12,5;10/25 mg
Hydrochlorothiazid|C03AA03|HCT-ratiopharm;Esidrix|Tbl:12,5;25 mg
Chlortalidon|C03BA04|Hygroton|Tbl:12,5;25;50 mg
Indapamid|C03BA11|Natrilix|ret-Tbl:1,5;2,5 mg
Xipamid|C03BA10|Aquaphor|Tbl:10;20;40 mg
Torasemid|C03CA04|Torem;Unat|Tbl:2,5;5;10;20;200 mg
Furosemid|C03CA01|Lasix;Furorese|Tbl:20;40;500 mg
Spironolacton|C03DA01|Aldactone|FTA:25;50;100 mg
Eplerenon|C03DA04|Inspra|FTA:25;50 mg
Doxazosin|C02CA04|Cardular;Diblocin|Tbl:1;2;4;8 mg
Clonidin|C02AC01|Catapresan|Tbl:0,075;0,15;0,3 mg
Moxonidin|C02AC05|Physiotens;Cynt|FTA:0,2;0,3;0,4 mg
Urapidil|C02CA06|Ebrantil|ret-Kps:30;60;90 mg
Atorvastatin|C10AA05|Sortis;Atorvastatin-ratiopharm|FTA:10;20;40;80 mg
Simvastatin|C10AA01|Zocor|FTA:10;20;40;80 mg
Rosuvastatin|C10AA07|Crestor|FTA:5;10;20;40 mg
Pravastatin|C10AA03|Pravasin|Tbl:10;20;40 mg
Ezetimib|C10AX09|Ezetrol|Tbl:10 mg
Rosuvastatin/Ezetimib|C10BA06|Rosuzet|FTA:10/10;20/10;40/10 mg
Atorvastatin/Ezetimib|C10BA05|Atozet|FTA:10/10;20/10;40/10;80/10 mg
Bempedoinsäure|C10AX15|Nilemdo|FTA:180 mg
Evolocumab|C10AX13|Repatha|Fertigpen:140 mg
Fenofibrat|C10AB05|Lipanthyl|Kps:67;145;160;200;267 mg
Isosorbidmononitrat|C01DA14|Ismo;Mono Mack;ISMN|Tbl:20;40;50;100;120 mg
Isosorbiddinitrat|C01DA08|Isoket;ISDN|Tbl:5;10;20;40 mg
Nitroglycerin|C01DA02|Nitrolingual;Nitrolingual akut|Spray:0,4 mg/Hub|Kps:0,8 mg
Ranolazin|C01EB18|Ranexa|ret-Tbl:375;500;750 mg
Ivabradin|C01EB17|Procoralan|FTA:5;7,5 mg
Digitoxin|C01AA04|Digimerck|Tbl:0,07 mg
Digoxin|C01AA05|Lanicor;Digacin|Tbl:0,1;0,2 mg
Amiodaron|C01BD01|Cordarex|Tbl:200 mg
Flecainid|C01BC04|Tambocor|Tbl:50;100 mg
Propafenon|C01BC03|Rytmonorm|FTA:150;300 mg
Dronedaron|C01BD07|Multaq|FTA:400 mg
Adrenalin (Notfall-Pen)|C01CA24|Fastjekt;Jext;Emerade|Fertigpen:150;300;500 µg
Hydrocortison (Creme/Salbe)|D07AA02|Hydrocortison Wolff;Soventol HC|Creme:0,5%;1%|Salbe:0,5%;1%
Mometason (topisch)|D07AC13|Ecural;Monovo|Creme:0,1%|Salbe:0,1%|Lösung:0,1%
Betamethason (topisch)|D07AC01|Betnesol V;Diprosone|Creme:0,05%;0,1%
Clobetasol|D07AD01|Dermoxin;Karison|Creme:0,05%|Salbe:0,05%
Prednicarbat|D07AC18|Dermatop|Creme:0,25%|Salbe:0,25%
Methylprednisolonaceponat|D07AC14|Advantan|Creme:0,1%|Salbe:0,1%|Fettsalbe:0,1%
Tacrolimus (topisch)|D11AH01|Protopic|Salbe:0,03%;0,1%
Pimecrolimus|D11AH02|Elidel|Creme:1%
Clotrimazol|D01AC01|Canesten;Clotrimazol-ratiopharm|Creme:1%|Vaginaltbl:100;200;500 mg
Ciclopirox|D01AE14|Batrafen|Nagellack:8%|Creme:1%
Terbinafin|D01BA02|Lamisil|Tbl:250 mg|Creme:1%
Fusidinsäure|D06AX01|Fucidine|Creme:2%|Salbe:2%
Mupirocin|D06AX09|Turixin|Salbe:2%
Metronidazol (topisch)|D06BX01|Metrogel;Rosiced|Gel:0,75%|Creme:0,75%
Adapalen|D10AD03|Differin|Gel:0,1%|Creme:0,1%
Benzoylperoxid|D10AE01|Aknefug-oxid;PanOxyl|Gel:3%;5%;10%
Imiquimod|D06BB10|Aldara|Creme:5%
Calcipotriol|D05AX02|Daivonex|Salbe:50 µg/g|Creme:50 µg/g
Calcipotriol/Betamethason|D05AX52|Daivobet;Enstilar|Salbe;Gel;Schaum
Harnstoff (Urea)|D02AE01|Basodexan;Eucerin Urea|Creme:5%;10%
Diclofenac (Gel)|M02AA15|Voltaren Schmerzgel;Diclac|Gel:1%;2%
Permethrin|P03AC04|Infectoscab;Infectopedicul|Creme:5%|Lösung:0,43%
Tamsulosin|G04CA02|Omnic;Tamsulosin-ratiopharm|ret-Kps:0,4 mg
Alfuzosin|G04CA01|Urion;Uroxatral|ret-Tbl:10 mg
Finasterid|G04CB01|Proscar|FTA:5 mg
Dutasterid|G04CB02|Avodart|Kps:0,5 mg
Solifenacin|G04BD08|Vesikur|FTA:5;10 mg
Mirabegron|G04BD12|Betmiga|ret-Tbl:25;50 mg
Trospiumchlorid|G04BD09|Spasmex|Drg:5;15;20 mg
Sildenafil|G04BE03|Viagra|FTA:25;50;100 mg
Tadalafil|G04BE08|Cialis|FTA:2,5;5;10;20 mg
Estradiol|G03CA03|Estrifam;Estradot;Oestrogel|Pflaster:25;37,5;50;75;100 µg/Tag|Tbl:1;2 mg|Gel:0,06%
Estriol (vaginal)|G03CA04|Ovestin;Oekolp|Vaginalcreme:1 mg/g|Vaginaltbl:0,03 mg
Progesteron|G03DA04|Utrogest|Kps:100;200 mg
Levonorgestrel (Notfallverhütung)|G03AD01|PiDaNa;Levonoraristo|Tbl:1,5 mg
Levonorgestrel/Ethinylestradiol|G03AA07|Microgynon;Leios|Drg:0,15/0,03 mg
Drospirenon/Ethinylestradiol|G03AA12|Yasmin;Aida|FTA:3/0,03 mg
Dienogest/Ethinylestradiol|G03AB08|Valette;Maxim|FTA:2/0,03 mg
Medroxyprogesteron|G03AC06|Depo-Clinovir|Inj:150 mg
Fosfomycin|J01XX01|Monuril;Fosfomycin Trometamol|Granulat:3 g
Nitrofurantoin|J01XE01|Nifurantin|ret-Kps:100 mg
Pivmecillinam|J01CA08|Selexid|FTA:200;400 mg
Amoxicillin|J01CA04|Amoxi;Amoxicillin-ratiopharm|FTA:500;750;1000 mg|Saft:250;500 mg/5 ml
Amoxicillin/Clavulansäure|J01CR02|Augmentan;Amoxiclav|FTA:500/125;875/125;1000/62,5 mg|Saft:400/57 mg/5 ml
Penicillin V|J01CE02|Isocillin;Infectocillin|FTA:1 Mio. I.E.;1,5 Mio. I.E.|Saft:250000 I.E./5 ml
Flucloxacillin|J01CF05|Staphylex;Flucloxacillin Sandoz|FTA:500 mg;1 g
Cefuroxim|J01DC02|Zinnat;Cefuhexal|FTA:250;500 mg
Cefpodoxim|J01DD13|Orelox|FTA:100;200 mg
Cefalexin|J01DB01|Cephalexin-ratiopharm|Kps:500;1000 mg
Cefadroxil|J01DB05|Grüncef|Tbl:500;1000 mg
Ciprofloxacin|J01MA02|Ciprobay;Ciprofloxacin-ratiopharm|FTA:250;500;750 mg
Levofloxacin|J01MA12|Tavanic|FTA:250;500 mg
Moxifloxacin|J01MA14|Avalox|FTA:400 mg
Azithromycin|J01FA10|Zithromax;Azithromycin-ratiopharm|FTA:250;500 mg
Clarithromycin|J01FA09|Klacid|FTA:250;500 mg
Roxithromycin|J01FA06|Rulid|FTA:150;300 mg
Doxycyclin|J01AA02|Doxyhexal;Doxycyclin-ratiopharm|Tbl:100;200 mg
Clindamycin|J01FF01|Sobelin;Clindamycin-ratiopharm|Kps:150;300;600 mg
Cotrimoxazol|J01EE01|Cotrim;Bactrim;Eusaprim|Tbl:480;960 mg|Saft:240 mg/5 ml
Trimethoprim|J01EA01|TMP-ratiopharm|Tbl:100;200 mg
Metronidazol|P01AB01|Clont;Flagyl|FTA:400;500 mg
Aciclovir|J05AB01|Zovirax;Aciclovir-ratiopharm|Tbl:200;400;800 mg|Creme:5%
Valaciclovir|J05AB11|Valtrex|FTA:500 mg
Famciclovir|J05AB09|Famvir|FTA:125;250;500 mg
Oseltamivir|J05AH02|Tamiflu|Kps:30;45;75 mg
Fluconazol|J02AC01|Diflucan;Fluconazol-ratiopharm|Kps:50;100;150;200 mg
Mebendazol|P02CA01|Vermox|Tbl:100 mg
Ivermectin|P02CF01|Stromectol|Tbl:3 mg
Influenza-Impfstoff|J07BB02|Influvac;Vaxigrip;Flucelvax|Fertigspritze:0,5 ml
Tetanus/Diphtherie/Pertussis (Tdap)|J07AJ52|Boostrix;Covaxis|Fertigspritze:0,5 ml
Pneumokokken-Impfstoff|J07AL02|Prevenar 20;Pneumovax 23;Vaxneuvance|Fertigspritze:0,5 ml
FSME-Impfstoff|J07BA01|Encepur;FSME-Immun|Fertigspritze:0,5 ml
Hepatitis-B-Impfstoff|J07BC01|Engerix-B;HBVaxPro|Fertigspritze:0,5 ml;1 ml
Herpes-zoster-Impfstoff|J07BK03|Shingrix|Fertigspritze:0,5 ml
COVID-19-Impfstoff (mRNA)|J07BN01|Comirnaty;Spikevax|Fertigspritze:0,3 ml;0,5 ml
Masern-Mumps-Röteln-Impfstoff|J07BD52|M-M-RvaxPro;Priorix|Fertigspritze:0,5 ml
HPV-Impfstoff|J07BM03|Gardasil 9|Fertigspritze:0,5 ml
Methotrexat|L04AX03|MTX Hexal;Lantarel|Tbl:2,5;7,5;10;15 mg|Fertigspritze:7,5;10;15;20;25 mg
Ibuprofen|M01AE01|Ibuflam;Nurofen;Ibu-ratiopharm|FTA:200;400;600;800 mg|Saft:20 mg/ml|Sup:60;125;150;500 mg
Diclofenac|M01AB05|Voltaren;Diclo-ratiopharm|MSR-Tbl:25;50 mg|ret-Tbl:75;100 mg|Sup:50;100 mg
Naproxen|M01AE02|Proxen;Naproxen-ratiopharm|FTA:250;500 mg
Etoricoxib|M01AH05|Arcoxia|FTA:30;60;90;120 mg
Celecoxib|M01AH01|Celebrex|Kps:100;200 mg
Dexketoprofen|M01AE17|Sympal|FTA:25 mg
Allopurinol|M04AA01|Zyloric;Allopurinol-ratiopharm|Tbl:100;300 mg
Febuxostat|M04AA03|Adenuric|FTA:80;120 mg
Colchicin|M04AC01|Colchicum-Dispert|Tbl:0,5 mg
Alendronsäure|M05BA04|Fosamax;Alendron-ratiopharm|Tbl:10;70 mg
Risedronsäure|M05BA07|Actonel|FTA:35 mg
Ibandronsäure|M05BA06|Bonviva|FTA:150 mg
Denosumab|M05BX04|Prolia|Fertigspritze:60 mg
Methocarbamol|M03BA03|Ortoton|FTA:750 mg
Tizanidin|M03BX02|Sirdalud|Tbl:2;4 mg
Baclofen|M03BX01|Lioresal|Tbl:10;25 mg
Tolperison|M03BX04|Mydocalm|FTA:50;150 mg
Paracetamol|N02BE01|Ben-u-ron;Paracetamol-ratiopharm|Tbl:500;1000 mg|Sup:75;125;250;500;1000 mg|Saft:40 mg/ml
Metamizol|N02BB02|Novalgin;Novaminsulfon|FTA:500 mg|Tr:500 mg/ml
Tramadol|N02AX02|Tramal;Tramadol-ratiopharm|Kps:50 mg|Tr:100 mg/ml|ret-Tbl:100;150;200 mg
Tilidin/Naloxon|N02AX01|Valoron N;Tilidin comp|ret-Tbl:50/4;100/8;150/12;200/16 mg
Oxycodon|N02AA05|Oxygesic;Oxycodon-ratiopharm|ret-Tbl:5;10;20;40;80 mg
Morphin|N02AA01|MST;Sevredol;Morphin Hexal|ret-Tbl:10;30;60;100 mg|Tbl:10;20 mg
Hydromorphon|N02AA03|Palladon|ret-Kps:4;8;16;24 mg
Tapentadol|N02AX06|Palexia|ret-Tbl:50;100;150;200;250 mg
Fentanyl|N02AB03|Durogesic;Fentanyl-ratiopharm|Pflaster:12;25;50;75;100 µg/h
Buprenorphin|N02AE01|Transtec;Norspan|Pflaster:5;10;15;20;35;52,5;70 µg/h
Sumatriptan|N02CC01|Imigran|Tbl:50;100 mg|Nasenspray:20 mg
Rizatriptan|N02CC04|Maxalt|Tbl:5;10 mg
Zolmitriptan|N02CC03|AscoTop|Tbl:2,5;5 mg
Pregabalin|N03AX16|Lyrica;Pregabalin-ratiopharm|Kps:25;50;75;100;150;200;300 mg
Gabapentin|N03AX12|Neurontin|FTA:100;300;400;600;800 mg
Carbamazepin|N03AF01|Tegretol|Tbl:200;400 mg|ret-Tbl:200;400 mg
Valproinsäure|N03AG01|Ergenyl;Convulex|ret-Tbl:150;300;500 mg
Lamotrigin|N03AX09|Lamictal|Tbl:25;50;100;200 mg
Levetiracetam|N03AX14|Keppra|FTA:250;500;750;1000 mg
Topiramat|N03AX11|Topamax|FTA:25;50;100;200 mg
Oxcarbazepin|N03AF02|Trileptal|FTA:150;300;600 mg
Citalopram|N06AB04|Cipramil|FTA:10;20;40 mg
Escitalopram|N06AB10|Cipralex|FTA:5;10;15;20 mg
Sertralin|N06AB06|Zoloft|FTA:50;100 mg
Fluoxetin|N06AB03|Fluctin|Kps:20 mg
Paroxetin|N06AB05|Seroxat|FTA:10;20;30;40 mg
Venlafaxin|N06AX16|Trevilor|ret-Kps:37,5;75;150;225 mg
Duloxetin|N06AX21|Cymbalta|MSR-Kps:30;60 mg
Mirtazapin|N06AX11|Remergil|FTA:15;30;45 mg
Bupropion|N06AX12|Elontril|ret-Tbl:150;300 mg
Amitriptylin|N06AA09|Saroten|FTA:10;25;50;75 mg
Johanniskraut-Extrakt|N06AP01|Laif 900;Jarsin|FTA:300;600;900 mg
Quetiapin|N05AH04|Seroquel|FTA:25;50;100;200;300;400 mg
Olanzapin|N05AH03|Zyprexa|Tbl:2,5;5;10;15;20 mg
Risperidon|N05AX08|Risperdal|FTA:0,5;1;2;3;4 mg
Aripiprazol|N05AX12|Abilify|Tbl:5;10;15;30 mg
Haloperidol|N05AD01|Haldol|Tbl:1;5;10 mg|Tr:2 mg/ml
Melperon|N05AD03|Eunerpan|FTA:25;50;100 mg|Saft:5 mg/ml
Pipamperon|N05AD05|Dipiperon|Tbl:40 mg|Saft:4 mg/ml
Lorazepam|N05BA06|Tavor|Tbl:0,5;1;2,5 mg
Diazepam|N05BA01|Valium|Tbl:2;5;10 mg
Bromazepam|N05BA08|Lexotanil|Tbl:3;6 mg
Zopiclon|N05CF01|Ximovan|FTA:3,75;7,5 mg
Zolpidem|N05CF02|Stilnox|FTA:5;10 mg
Melatonin|N05CH01|Circadin|ret-Tbl:2 mg
Donepezil|N06DA02|Aricept|FTA:5;10 mg
Memantin|N06DX01|Axura;Ebixa|FTA:10;20 mg
Rivastigmin|N06DA03|Exelon|Pflaster:4,6;9,5;13,3 mg/24 h|Kps:1,5;3;4,5;6 mg
Levodopa/Benserazid|N04BA02|Madopar|Kps:50/12,5;100/25;200/50 mg
Levodopa/Carbidopa|N04BA02|Nacom;Levocomp|Tbl:100/25;250/25 mg
Pramipexol|N04BC05|Sifrol|Tbl:0,088;0,18;0,35;0,7;1,1 mg
Ropinirol|N04BC04|Requip|FTA:0,25;1;2;5 mg
Rasagilin|N04BD02|Azilect|Tbl:1 mg
Methylphenidat|N06BA04|Ritalin;Medikinet|Tbl:5;10;20 mg|ret-Kps:5;10;20;30;40;50;60 mg
Betahistin|N07CA01|Vasomotal;Betahistin-ratiopharm|Tbl:6;8;12;16;24 mg
Nicotin|N07BA01|Nicorette;NiQuitin|Pflaster:7;14;21 mg/24 h|Kaugummi:2;4 mg
Dimenhydrinat|R06AA02|Vomex A;Superpep|Tbl:50 mg|Sup:40;70;150 mg
Doxylamin|R06AA09|Hoggar Night;Gittalun|Tbl:25 mg
Salbutamol|R03AC02|Ventolin;Salbutamol-ratiopharm|Dosieraerosol:100 µg/Hub
Formoterol|R03AC13|Foradil;Oxis|Inhalationskapseln:12 µg|Dosieraerosol:6;12 µg
Salmeterol/Fluticason|R03AK06|Viani;Seretide;Atmadisc|Inhalator:50/100;50/250;50/500 µg
Budesonid/Formoterol|R03AK07|Symbicort;Bufori|Inhalator:160/4,5;320/9 µg
Beclometason/Formoterol|R03AK08|Foster;Fostair|Dosieraerosol:100/6;200/6 µg
Fluticason/Vilanterol|R03AK10|Relvar Ellipta|Inhalator:92/22;184/22 µg
Budesonid (inhalativ)|R03BA02|Pulmicort;Budenobronch|Inhalator:100;200;400 µg
Beclometason (inhalativ)|R03BA01|Junik;Sanasthmax|Dosieraerosol:50;100;200 µg
Tiotropium|R03BB04|Spiriva|Inhalationskapseln:18 µg|Respimat:2,5 µg
Ipratropiumbromid|R03BB01|Atrovent|Dosieraerosol:20 µg/Hub
Umeclidinium/Vilanterol|R03AL03|Anoro Ellipta|Inhalator:55/22 µg
Montelukast|R03DC03|Singulair|FTA:10 mg|Kautbl:4;5 mg
Theophyllin|R03DA04|Euphylong;Bronchoretard|ret-Kps:200;300;400 mg
Acetylcystein|R05CB01|ACC;Fluimucil|Brausetbl:100;200;600 mg|Granulat:100;200 mg
Ambroxol|R05CB06|Mucosolvan;Ambroxol-ratiopharm|Tbl:30 mg|Saft:15 mg/5 ml|Lösung:7,5 mg/ml
Bromhexin|R05CB02|Bisolvon|Tbl:8 mg|Saft:4 mg/5 ml
Dextromethorphan|R05DA09|Wick Hustenstiller|Saft:15 mg/5 ml
Codein|R05DA04|Codeintropfen|Tr:2 mg/ml
Efeublätter-Extrakt|R05CA|Prospan|Saft:35 mg/5 ml|Hustentropfen
Cetirizin|R06AE07|Zyrtec;Cetirizin-ratiopharm|FTA:10 mg|Saft:1 mg/ml
Loratadin|R06AX13|Lisino;Loratadin-ratiopharm|Tbl:10 mg
Desloratadin|R06AX27|Aerius|FTA:5 mg
Levocetirizin|R06AE09|Xusal|FTA:5 mg
Fexofenadin|R06AX26|Telfast|FTA:120;180 mg
Dimetinden|R06AB03|Fenistil|Tr:1 mg/ml|Gel:1 mg/g
Mometason (Nasenspray)|R01AD09|Nasonex;Mometason-ratiopharm|Nasenspray:50 µg/Hub
Fluticason (Nasenspray)|R01AD08|Flixonase;Fluticason-ratiopharm|Nasenspray:50 µg/Hub
Azelastin (Nasenspray)|R01AC03|Allergodil|Nasenspray:1 mg/ml
Xylometazolin|R01AA07|Otriven;Olynth|Nasenspray:0,05%;0,1%|Nasentr.:0,05%;0,1%
Oxymetazolin|R01AA05|Nasivin|Nasenspray:0,01%;0,025%;0,05%
Cromoglicinsäure|R01AC01|Vividrin|Nasenspray:2%|Aug:2%
Latanoprost|S01EE01|Xalatan;Monoprost|Aug:50 µg/ml
Timolol (Augen)|S01ED01|Timomann;Arutimol|Aug:0,25%;0,5%
Dorzolamid|S01EC03|Trusopt|Aug:2%
Brimonidin|S01EA05|Alphagan|Aug:0,2%
Dexamethason (Augen)|S01BA01|Dexa-sine;Dexapos|Aug:0,1%
Chloramphenicol (Augen)|S01AA01|Posifenicol|Salbe:1%
Gentamicin (Augen)|S01AA11|Gent-Ophtal|Aug:0,3%
Hyaluronsäure (Augen)|S01XA20|Hylo-Comod;Hylo-Gel|Aug:0,1%;0,2%;0,3%
Ciprofloxacin (Ohr)|S02AA15|Ciloxan|Ohrentr.:0,3%
Ofloxacin (Ohr)|S02AA16|Floxal;Ofloxacin-ratiopharm|Ohrentr.:0,3%
Natriumchlorid 0,9% (Infusion)|B05XA03|NaCl 0,9%;Isotone Kochsalzlösung|Infusion:100 ml;250 ml;500 ml
Prednisolon (Notfall)|H02AB06|Solu-Decortin H;Rectodelt|Inj:25 mg;50 mg;100 mg;250 mg
`;
