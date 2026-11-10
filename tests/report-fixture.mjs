export function reportFixture({inspection:inspectionEdits={},edit={},photos=[],...report}={}){
 const inspection={id:'inspection-id',title:'Lab inspection',date:'2026-10-22',inspector:'Inspector',...inspectionEdits};
 return {title:'Inspection report',preparedDate:'2026-11-04',...report,groups:[inspection],rows:[{include:true,key:inspection.id+'|finding-id',inspection,original:{id:'finding-id',reference:'F002'},edit:{description:'Possibly in use. The measured clearance was 72 cm.',building:'S13',floor:'02',room:'13C',category:'',priority:'',action:'',remarks:'',...edit},photos:structuredClone(photos),sources:['source.zip']}]};
}
