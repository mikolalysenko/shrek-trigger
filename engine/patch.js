import {cast} from '../content/cast.js';
import {items} from '../content/items.js';
import {dialogue} from '../content/dialogue.js';
import {encode,decode,encodeDialogue,dialogueLength,encodeName} from './text.js';
import {makeCharacterRecords,tile4bpp,paletteBytes} from './sprites.js';
import {portrait,portraitArtInfo} from './portraits.js';
import {u16,put16,put24,applyRecords,fileOffset,u24,BASE_SHA256} from './rom.js';
import {compress,decompress} from './compression.js';
import {patchTitle} from './title.js';
import {patchCredits} from './credits.js';
import {patchEnvironment} from './environment.js';
import {patchFinaleGraphics} from './finale.js';
import {patchFinaleAI} from './enemy-ai.js';
import {patchDragon} from './dragon.js';
import {dragonEscapeEvent,dragonHangarEvent} from './dragon-mode7.js';
import {patchSupportingCast} from './supporting-cast.js';
import {patchGuyFieri} from './guy-fieri.js';
import {patchCarnival,carnivalEvent} from './carnival.js';
import {supportingCast as supportingSpecs} from '../content/supporting-cast.js';
import {carnivalCast,hatchetProps} from '../content/carnival.js';
import {spriteResourcePools} from './native-sprites.js';
import {patchHatchetWeapon} from './hatchet-weapon.js';
import {replacedPacketPools,replacedMusicPools,coalesceReclaimedPools} from './resource-pools.js';
import {courtBeasts as courtBeastSpecs} from '../content/court-beasts.js';
import {patchCourtBeasts} from './court-beasts.js';
import {nativeEventCount,sourceDialogueEvents} from '../content/dialogue-ownership.js';
import {replacedDialoguePools} from './dialogue-pools.js';
import {dulocTank as dulocTankSpecs} from '../content/duloc-tank.js';
import {patchDulocTank} from './duloc-tank.js';
import {patchWorkshopPuppets} from './workshop-puppets.js';
import {customFutureMachines as futureMachineSpecs,supplyKeeper,stockMachineGraphics} from '../content/future-machines.js';
import {patchFutureMachines} from './future-machines.js';
import {patchRacing} from './racing.js';
import {customWildlifeFamilies as wildlifeFamilies,customFutureWildlife as wildlifeSpecs,stockWildlifeFamilyKeys} from '../content/future-wildlife.js';
import {futureWildlifeSprite} from './future-wildlife-art.js';
import {nativeGuardFamilies,nativeGuards} from '../content/native-guards.js';
import {nativeGuardSprite} from './native-guard-art.js';
import {customCourtPalaceFamilies as courtPalaceFamilies,customCourtPalaceActors as courtPalaceActors,stockCourtPalaceFamilyKeys} from '../content/court-palace.js';
import {courtPalaceSprite} from './court-palace-art.js';
import {customTownsfolk as townsfolkSpecs} from '../content/townsfolk.js';
import {patchTownsfolk} from './townsfolk.js';
import {customStorybookActors as storybookActors} from '../content/storybook-actors.js';
import {patchStorybookActors} from './storybook-actors.js';
import {paradePaletteEvent,paradePalettes,paradeEventSource} from './parade-palettes.js';
import {fairTownkeeperEvent,fairTownkeepers} from './fair-townkeepers.js';
import {patchActorFamilies} from './actor-families.js';
import {customMedinaFamilies as medinaFamilies,customMedinaActors as medinaSpecs,stockMedinaFamilyKeys} from '../content/medina-actors.js';
import {medinaActorSprite} from './medina-art.js';
import {patchWorldLabels} from './world-labels.js';
import {bakeryEvent} from './bakery-events.js';
import {customBridgeFamilies as bridgeFamilies,customBridgeActors as bridgeSpecs,stockBridgeFamilyKeys} from '../content/bridge-actors.js';
import {bridgeActorSprite} from './bridge-art.js';
import {enforcerFamilies,enforcerActors as enforcerSpecs} from '../content/enforcer-actors.js';
import {enforcerSprite} from './enforcer-art.js';
import {ghostFamilies,ghostActors as ghostSpecs} from '../content/ghost-actors.js';
import {ghostSprite} from './ghost-art.js';
import {patchMagicMirror,magicMirrorResources} from './magic-mirror.js';
import {customBakeryFamilies as bakeryFamilies,customBakeryActors as bakerySpecs,stockBakeryFamilyKeys} from '../content/bakery-actors.js';
import {retainedBossNames,storyBattleNames} from '../content/retained-boss-names.js';
import {bakerySprite} from './bakery-art.js';
import {bakeryVillagerFamilies,bakeryVillagers as bakeryVillagerSpecs} from '../content/bakery-villagers.js';
import {bakeryVillagerSprite} from './bakery-village-art.js';
import {skyDrakeFamilies,skyDrakes as skyDrakeSpecs} from '../content/sky-drakes.js';
import {skyDrakeSprite} from './sky-drake-art.js';
import {patchSkyDrakeWorld} from './sky-drakes.js';
import {patchFurnaceBackground} from './furnace-background.js';
import {patchCosmicMuffin,cosmicMuffinSpawnSprite} from './cosmic-muffin.js';
import {cosmicMuffinActors,cosmicMuffinSpawnActors,cosmicMuffinSpawnFamilies} from '../content/cosmic-muffin.js';
import {endgameFamilies,endgameActors} from '../content/endgame-actors.js';
import {endgameSprite} from './endgame-art.js';
import {cosmicInteriorActors} from '../content/cosmic-interior.js';
import {patchCosmicInterior} from './cosmic-interior.js';
import {tysonReveal as tysonRevealActor} from '../content/tyson-reveal.js';
import {patchTysonReveal} from './tyson-reveal.js';
import {patchSwampSpin} from './swamp-spin.js';
import {patchEyeLasers} from './eye-lasers.js';
import {patchSwampBelch} from './swamp-belch.js';
import {patchTechJuice} from './tech-juice.js';
import {patchOgreRoar} from './ogre-roar.js';
import {patchStormBreath} from './storm-breath.js';
import {patchGetUp} from './get-up.js';
import {patchMilk} from './milk.js';
import {patchTechThemes} from './tech-themes.js';
import {techThemes} from '../content/tech-themes.js';
import {patchSwampPiledriver} from './swamp-piledriver.js';
import {patchFourLayerSlam} from './four-layer-slam.js';
import {patchNativeTechEffects} from './native-tech-effects.js';
import {patchTechniqueRevision} from './technique-revision.js';
import {patchBigEyesCharm} from './charm-big-eyes.js';
import {patchNineLives} from './nine-lives.js';
import {patchComboDescriptions} from './combo-descriptions.js';
import {repackTechHelp} from './tech-help.js';
import {repackItemHelp} from './item-help.js';
import {patchSwampTerms} from './swamp-terms.js';
import {patchCharacterEffects} from './native-character-effects.js';
import {physicalEffectDefinitions,comboEffectDefinitions} from './physical-tech-art.js';
import {patchFaygo} from './faygo.js';
import {shrekReplies} from '../content/shrek-dialogue.js';
import {patchShrekDialogue} from './shrek-dialogue.js';
import {patchElements} from './elements.js';
import {patchMusic,musicEvent} from './music.js';
import {eggChallenge} from '../content/resurrection.js';
import {resurrectionEvent} from './resurrection.js';
import {homeEvent} from './home-event.js';
import {donkeyFamilyEvent} from './donkey-family.js';
import {mrWorldwideBattleMessages} from '../content/mr-worldwide.js';
import {greeterEvent,walmartEvent,patchMrWorldwide} from './mr-worldwide.js';
import {additionalDialogue} from './event-additions.js';
import {ResourceAllocator,ResourceAllocationError,planResources} from './resource-allocation.js';
import {patchPlayerFramePacking} from './player-frame-packing.js';
import {placePlayerGraphics,PlayerGraphicsCapacityError} from './player-graphics-packing.js';
import {expandHirom,extendedDataAllocator,cartridgeDataAddress,HIROM_BYTES,EXHIROM_BYTES} from './expanded-rom.js';
import {patchPlayerGraphicsStreaming} from './player-graphics-streaming.js';
import {placeNpcGraphicsStreams,patchNpcGraphicsStreaming} from './npc-graphics-streaming.js';

export function buildPatch(base,{techs,layouts,cartridge='auto'}) {
  if(!['auto','hirom','exhirom'].includes(cartridge))throw Error('Unknown cartridge layout');
  if(cartridge==='exhirom')return buildCartridge(base,{techs,layouts,extended:true});
  try{return buildCartridge(base,{techs,layouts,extended:false});}
  catch(error){
    if(cartridge!=='auto'||!(error instanceof PlayerGraphicsCapacityError||error instanceof ResourceAllocationError))throw error;
    const result=buildCartridge(base,{techs,layouts,extended:true});
    result.audit.resources.expansionReason=error.message;return result;
  }
}

function buildCartridge(base,{techs,layouts,extended}) {
  const requirements=new Map();
  const measured=buildPass(base,{techs,layouts,extended,requirements,measure:true});
  let plan=planResources(measured.spans,requirements);
  // Relocating a text pointer can change its compressed event's size. Keep
  // measured upper bounds and rebuild if needed; never truncate a packet or
  // publish an intermediate build with unresolved addresses.
  for(let pass=1;pass<=16;pass++){
    try{
      const result=buildPass(base,{techs,layouts,extended,requirements,plan});
      result.audit.resources.packingPasses=pass;
      result.audit.resources.reservedBytes=[...plan.slots.values()].reduce((n,s)=>n+s.length,0);return result;
    }catch(error){
      if(!(error instanceof ResourceAllocationError)||pass===16)throw error;
      plan=planResources(error.spans,requirements);
    }
  }
}

function buildPass(base,{techs,layouts,extended=false,requirements,plan,measure=false}) {
  const records=[],characters=[],portraits=[],allocations=[],pools=[];
  // Custom banks stream raw from owned ExHiROM. Restored stock banks keep the
  // native decompressed path (non-streamed custom banks never exceed their
  // original decoded size, so no scene needs more field heap than stock),
  // except the four townsfolk banks of the crowded ending scenes (11, 12, 35,
  // 36), which keep the raw streams of the verified candidate. Decompressing
  // them shifts the ending's timing so that SnesJs, which lacks the short odd
  // scanline, phase-locks the native $4210 vblank poll in "What the Prophet
  // Seeks"; Snes9x and bsnes pass either way.
  const streamedGraphics=new Set(extended?[...supportingSpecs.map(a=>a.gfx),249,...carnivalCast.filter(a=>a.size===0).map(a=>a.gfx),11,12,35,36,15,20,24,25,37,42,52,53,78,133,141,143,155,161,163,166,176,181,182,191,208,209,216,238,252]:[]);
  let hatchetFrames;
  const add=(offset,bytes,label)=>records.push({offset,bytes,label});
  const playerRecords=cast.map(c=>makeCharacterRecords(base,c.id,{allowGrowth:true}));
  const playerGraphics=placePlayerGraphics(base,playerRecords,{extended});
  const extendedCompressed=extended?extendedDataAllocator(playerGraphics.extended.pools):null;
  records.push(...playerGraphics.records);pools.push(...playerGraphics.pools);
  for(const c of cast) {
    const result=playerRecords[c.id];characters.push(result.audit);
    if(result.hatchetFrames)hatchetFrames=result.hatchetFrames;
    const assembly=result.audit.assembly;
    pools.push({next:assembly.offset+assembly.bytes,end:assembly.offset+assembly.sourceBytes});
    const face=portrait(c.id);
    const tiles=[];for(let y=0;y<48;y+=8)for(let x=0;x<48;x+=8)tiles.push(...tile4bpp(face,48,x,y));
    add(0x3f0000+c.id*0x480,Uint8Array.from(tiles),c.name+' portrait');
    add(0x3f0000+u16(base,0x3fce78+c.id*2),paletteBytes(c.id,{full:true}),c.name+' portrait palette');
    const raster=portraitArtInfo(c.id);
    portraits.push({id:c.id,width:48,height:48,bytes:tiles.length,offset:0x3f0000+c.id*0x480,colors:12,native:true,
      artwork:raster?{kind:'raster',sourceType:raster.sourceType,sources:raster.provenance}:{kind:'earlier artwork'}});
  }
  // Every edited event is rebuilt and its one global pointer replaced. Its
  // old compressed packet can therefore be reused without expanding the ROM.
  // Exclude aliased packets and reject overlaps rather than assuming padding.
  const addPool=(start,end)=>{
    if(pools.some(p=>start<p.end&&end>p.next))throw Error('Reclaimed resource overlaps another allocation pool');
    for(let p=start;p<end;){const q=Math.min(end,(p|0xffff)+1);pools.push({next:p,end:q});p=q;}
  };
  const reclaimedEvents=[];
  const paradeSource=paradeEventSource(base),paradeLayout=layouts.find(l=>l.eventId===paradeSource.eventId);
  if(paradeLayout&&paradeLayout.location!==paradeSource.location)throw Error('Parade event has an unexpected dialogue owner');
  for(const layout of layouts){
    if(layout.location!==0&&!dialogue[layout.location])continue;
    // Newly inventoried events are emitted in extended data, but their source
    // packets stay byte-for-byte intact. The old audit did not know every
    // native consumer of these regions; never reclaim them just because the
    // global event pointer has a replacement.
    if(layout.storage==='extended'&&layout.eventId!==paradeSource.eventId)continue;
    const source=sourceDialogueEvents.find(([id])=>id===layout.eventId);
    if(!source||source[1]!==layout.eventPointer||source[2].length!==layout.tableCommands.length||!source[2].every(([pos])=>layout.tableCommands.includes(pos)))throw Error('Incomplete dialogue table commands for location '+layout.location);
    const start=layout.eventPointer,aliases=[];
    for(let id=0;id<nativeEventCount;id++)if(fileOffset(u24(base,0x3cf9f0+id*3))===start)aliases.push(id);
    if(aliases.length!==1||aliases[0]!==layout.eventId)continue;
    const end=start+decompress(base,start).length;
    addPool(start,end);
    reclaimedEvents.push({eventId:layout.eventId,offset:start,length:end-start});
  }
  if(!paradeLayout){
    addPool(paradeSource.offset,paradeSource.offset+paradeSource.length);
    reclaimedEvents.push({eventId:paradeSource.eventId,offset:paradeSource.offset,length:paradeSource.length});
  }
  const spriteSpecs=[...supportingSpecs,...carnivalCast,...hatchetProps,...courtBeastSpecs,...dulocTankSpecs,...futureMachineSpecs,...(stockMachineGraphics.has(supplyKeeper.gfx)?[]:[supplyKeeper]),...nativeGuards,...courtPalaceActors,...townsfolkSpecs,...storybookActors,...wildlifeSpecs,...medinaSpecs,...bridgeSpecs,...enforcerSpecs,...ghostSpecs,...bakerySpecs,...bakeryVillagerSpecs,...skyDrakeSpecs,...cosmicMuffinActors,...cosmicMuffinSpawnActors,...endgameActors,...cosmicInteriorActors,tysonRevealActor];
  // Dragon's three actor banks and the final formation are also replaced in
  // full. Their in-place assemblies stay reserved; only the relocated ward
  // assembly is added here. Sparse assembly gaps must never become free space.
  const reclaimedSprites=spriteResourcePools(base,[...spriteSpecs.map(a=>a.gfx),151,202,212,214,237,...magicMirrorResources.graphics],[...spriteSpecs.map(a=>a.asm),223,...magicMirrorResources.assemblies]);
  // Size-class 3 loads one fixed 96-tile frame at C0:E12A. The following
  // all-zero record in the source tank bank is padding, not another pose.
  for(const p of reclaimedSprites)if(p.field===1&&p.id===119)p.length=240;
  for(const p of reclaimedSprites)addPool(p.offset,p.offset+p.length);
  const reclaimedPackets=replacedPacketPools(base);
  for(const p of reclaimedPackets)addPool(p.offset,p.offset+p.length);
  const reclaimedMusic=replacedMusicPools(base);
  for(const p of reclaimedMusic)addPool(p.offset,p.offset+p.length);
  const reclaimedDialogue=replacedDialoguePools(base,layouts.filter(l=>dialogue[l.location]&&l.storage!=='extended').map(l=>l.eventId));
  for(const p of reclaimedDialogue)addPool(p.offset,p.offset+p.length);
  pools.splice(0,pools.length,...coalesceReclaimedPools(pools));
  const allocator=new ResourceAllocator(pools,requirements,plan,measure);
  function allocate(bytes,label) {
    const p=allocator.allocate(bytes.length,label);
    add(p,bytes,label);allocations.push({label,offset:p,length:bytes.length});return p;
  }
  // These streamed custom banks keep their standard compressed representation
  // in owned ExHiROM data, which leaves the fragmented original banks room for
  // assemblies; execution, events and assembly tables stay in the fast banks.
  // Restored stock banks keep their original packets in place, so the Duloc
  // guards, Master Glaze, Rumpelstiltskin and the golems join the court beasts,
  // and so does bank 249 now that it carries Donkey's family.
  const extendedCompressedIds=new Set(extended?[78,133,141,143,216,249]:[]);
  const allocateGraphics=(bytes,label,gfx)=>extendedCompressedIds.has(gfx)?extendedCompressed.allocate(bytes,label):allocate(bytes,label);
  for(const t of techs) {
    if(t.status.includes('stock-animation')&&!t.status.includes('moved-slot'))continue;
    const p=0xc15c4+t.id*11,magic=base[p]===0x2f;
    add(p,Uint8Array.from([...(magic?[0x2f]:[]),...encodeName(t.short,{length:magic?10:11})]),'tech '+t.id+': '+t.name);
  }
  for(const item of items) {
    const p=0xc0b5e+item.id*11;
    add(p,Uint8Array.from([base[p],...encodeName(item.short,{length:10})]),'item '+item.id+': '+item.name);
    // Help lines are written by engine/item-help.js for the whole table.
  }
  const eventAudit=[],shrekReplyEntries=[];
  for(const layout of layouts) {
    const layoutExtended=extended&&layout.storage==='extended',allocateLayout=layoutExtended?extendedCompressed.allocate:allocate;
    const additions=additionalDialogue[layout.location]??{};
    const replacements=dialogue[layout.location];if(!replacements&&layout.location!==0)continue;
    let event=decompress(base,layout.eventPointer).bytes;
    if(layout.location===0) {
      const needle=encode('Crono'),i=event.findIndex((v,p)=>needle.every((b,k)=>event[p+k]===b));
      if(i<0)throw Error('New-game name initialization signature missing');
      [...cast.map(c=>c.short),'Dragn'].forEach((name,k)=>event.set(encode(name,{length:6,pad:0}),i+k*6));
    } else {
      const count=Math.max(...layout.strings.map(s=>s.id),...Object.keys(additions).map(Number))+1,packed=new Array(count*2).fill(0),positions=new Map();
      if(count>256)throw Error('Native field dialogue ID exceeds one byte');
      // A valid empty string for unused IDs prevents accidental zero-bank reads.
      const blank=packed.length;packed.push(0);
      for(const s of layout.strings) {
        positions.set(s.id,packed.length);
        const bytes=replacements[s.id]!==undefined?encodeDialogue(replacements[s.id],base):base.subarray(s.address,s.address+s.capacity);
        packed.push(...bytes);
      }
      for(const[id,text]of Object.entries(additions)){
        if(positions.has(+id))throw Error('Additional dialogue overlaps a source ID');
        positions.set(+id,packed.length);packed.push(...encodeDialogue(text,base));
      }
      const p=allocateLayout(Uint8Array.from(packed),'dialogue table '+layout.location);
      const record=layoutExtended?extendedCompressed.records.at(-1):records.at(-1);
      for(let id=0;id<count;id++)put16(record.bytes,id*2,(p&0xffff)+(positions.get(id)??blank));
      for(const [id,text]of Object.entries(shrekReplies[layout.location]??{})){
        const sourceText=replacements[id],position=positions.get(+id);
        if(sourceText===undefined||position===undefined)throw Error(`Shrek reply has no authored source: ${layout.location}:${id}`);
        const bytes=encodeDialogue(sourceText,base);
        if(bytes.at(-1)!==0)throw Error('Shrek reply needs a null-terminated source');
        shrekReplyEntries.push({location:layout.location,id:+id,text,sourceText,terminator:p+position+bytes.length-1});
      }
      for(const command of layout.tableCommands) {
        if(event[command]!==0xb8)throw Error('Event B8 signature mismatch');
        put24(event,command+1,cartridgeDataAddress(p));
      }
      for(const id of Object.keys(replacements))if(!positions.has(Number(id)))throw Error(`Unused dialogue ${layout.location}:${id}`);
    }
    if(layout.location===474)event=dragonEscapeEvent(event);
    event=dragonHangarEvent(event,layout.location);
    event=carnivalEvent(event,layout.location);
    event=bakeryEvent(event,layout.location);
    event=musicEvent(event,layout.location);
    event=resurrectionEvent(event,layout.location);
    event=homeEvent(event,layout.location);
    event=donkeyFamilyEvent(event,layout.location);
    event=greeterEvent(event,layout.location);
    event=walmartEvent(event,layout.location);
    event=fairTownkeeperEvent(event,layout.location);
    event=paradePaletteEvent(event,layout.location);
    const packed=compress(event);
    if(BufferCompare(event,decompress(packed,0).bytes)!==0)throw Error('Event codec round trip failed');
    const p=allocateLayout(packed,'event '+layout.eventId),ptr=new Uint8Array(3);put24(ptr,0,cartridgeDataAddress(p));
    add(0x3cf9f0+layout.eventId*3,ptr,'event pointer '+layout.eventId);
    eventAudit.push({location:layout.location,eventId:layout.eventId,offset:p,compressedBytes:packed.length,eventBytes:event.length,dialogues:Object.keys(replacements??{}).length+Object.keys(additions).length});
  }
  // Older layout inventories omitted the parade; retain the standalone palette
  // rebuild path for those fixtures, but never reclaim or emit the packet twice.
  if(!paradeLayout){
    const paradeEvent=paradePaletteEvent(paradeSource.bytes,paradeSource.location),paradePacked=compress(paradeEvent);
    const paradeOffset=allocate(paradePacked,'event '+paradeSource.eventId),paradePointer=new Uint8Array(3);put24(paradePointer,0,0xc00000|paradeOffset);
    add(0x3cf9f0+paradeSource.eventId*3,paradePointer,'event pointer '+paradeSource.eventId);
    eventAudit.push({location:80,eventId:paradeSource.eventId,offset:paradeOffset,compressedBytes:paradePacked.length,eventBytes:paradeEvent.length,dialogues:0});
  }
  if(shrekReplyEntries.length!==Object.values(shrekReplies).reduce((n,lines)=>n+Object.keys(lines).length,0))throw Error('Unbuilt Shrek speaking line');
  const shrekDialogue=patchShrekDialogue(base,shrekReplyEntries,allocate,add);
  const title=patchTitle(base,allocate,add);
  const credits=patchCredits(base,add);
  const environment=patchEnvironment(base,allocate,add,{allocateGraphics,allocateAssembly:extendedCompressed?extendedCompressed.allocate:allocate});
  environment.worldLabels=patchWorldLabels(base,add);
  const supportingCast=patchSupportingCast(base,allocate,add);
  const guyFieri=patchGuyFieri(base,allocate,add);
  const carnival=patchCarnival(base,allocate,add);
  carnival.equippedWeapon=patchHatchetWeapon(base,hatchetFrames,allocate,add);
  const pussFrames=characters[4].assembly;
  const menuAssemblyAliases=pussFrames.bytes<pussFrames.sourceBytes?[{id:4,address:carnival.equippedWeapon.assembly|0xc00000}]:[];
  const playerFramePacking=patchPlayerFramePacking(base,characters,allocate,add,{menuAssemblyAliases});
  const playerGraphicsStreaming=extended?patchPlayerGraphicsStreaming(base,allocate,add):null;
  const courtBeasts=patchCourtBeasts(base,allocate,add,{streamedGraphics,allocateGraphics});
  const dulocTank=patchDulocTank(base,allocate,add,{allocateGraphics});
  const workshopPuppets=patchWorkshopPuppets(base,add);
  const futureMachines=patchFutureMachines(base,allocate,add,{streamedGraphics});
  const racing=patchRacing(base,allocate,add);
  const guards=patchActorFamilies(base,nativeGuardFamilies,nativeGuardSprite,allocate,add,records,{streamedGraphics,allocateGraphics});
  const courtPalace=patchActorFamilies(base,courtPalaceFamilies,courtPalaceSprite,allocate,add,records,{streamedGraphics,allocateGraphics});
  courtPalace.stockRestored=[...stockCourtPalaceFamilyKeys];
  const impActors={actors:[],stockRestored:['swamp-imps'],extraVramBytes:0,extraWramBytes:0};
  const townsfolk=patchTownsfolk(base,allocate,add,records,{streamedGraphics,allocateGraphics});
  townsfolk.paradePalettes=paradePalettes;
  townsfolk.fairTownkeepers=fairTownkeepers;
  const storybook=patchStorybookActors(base,allocate,add,records,{streamedGraphics,allocateGraphics});
  const futureWildlife=patchActorFamilies(base,wildlifeFamilies,futureWildlifeSprite,allocate,add,records,{streamedGraphics,allocateGraphics});
  futureWildlife.stockRestored=[...stockWildlifeFamilyKeys];
  const medinaActors=patchActorFamilies(base,medinaFamilies,medinaActorSprite,allocate,add,records,{streamedGraphics});
  medinaActors.stockRestored=[...stockMedinaFamilyKeys];
  const swampCreatures={actors:[],stockRestored:['swamp-dozers'],extraVramBytes:0,extraWramBytes:0};
  const bridgeActors=patchActorFamilies(base,bridgeFamilies,bridgeActorSprite,allocate,add,records,{streamedGraphics,allocateGraphics});
  bridgeActors.stockRestored=[...stockBridgeFamilyKeys];
  const enforcers=patchActorFamilies(base,enforcerFamilies,enforcerSprite,allocate,add,records,{streamedGraphics});
  const ghosts=patchActorFamilies(base,ghostFamilies,ghostSprite,allocate,add,records,{streamedGraphics});
  const magicMirror=patchMagicMirror(base,allocate,add);
  const bakeryActors=patchActorFamilies(base,bakeryFamilies,bakerySprite,allocate,add,records,{streamedGraphics,allocateGraphics});
  bakeryActors.stockRestored=[...stockBakeryFamilyKeys];
  bakeryActors.background=patchFurnaceBackground(base,allocate,add);
  bakeryActors.community=patchActorFamilies(base,bakeryVillagerFamilies,bakeryVillagerSprite,allocate,add,records,{streamedGraphics,allocateGraphics});
  bakeryActors.drakes=patchActorFamilies(base,skyDrakeFamilies,skyDrakeSprite,allocate,add,records,{streamedGraphics,allocateGraphics,allocateAssembly:extendedCompressed?extendedCompressed.allocate:allocate});
  bakeryActors.drakes.world=patchSkyDrakeWorld(base,allocate,add);
  // Retired boss redraws keep the names their dialogue and labels use.
  for(const a of retainedBossNames)add(0xc6500+a.enemy*11,encode(a.short,{length:11}),a.name+' battle name');
  for(const a of storyBattleNames){
    if(decode(base.subarray(0xc6500+a.enemy*11,0xc6500+a.enemy*11+11)).trim()!==a.source)throw Error('Story battle name source '+a.source);
    add(0xc6500+a.enemy*11,encode(a.short,{length:11}),a.source+' story battle name');
  }
  const dragon=patchDragon(base,allocate,add,extendedCompressed?extendedCompressed.allocate:allocate);
  const cosmicMuffin=patchCosmicMuffin(base,allocate,add,{streamedGraphics,allocateGraphics});
  cosmicMuffin.offspring=patchActorFamilies(base,cosmicMuffinSpawnFamilies,cosmicMuffinSpawnSprite,allocate,add,records,{streamedGraphics,allocateGraphics});
  cosmicMuffin.interior=patchCosmicInterior(base,allocate,add,{streamedGraphics,allocateGraphics});
  const endgame=patchActorFamilies(base,endgameFamilies,endgameSprite,allocate,add,records,{streamedGraphics,allocateGraphics,allocateAssembly:extendedCompressed?extendedCompressed.allocate:allocate});
  const finale=patchFinaleGraphics(base,allocate,add);
  const tysonReveal=patchTysonReveal(base,allocate,add,records,{streamedGraphics});
  const finaleAI=patchFinaleAI(base,allocate,add,{messages:mrWorldwideBattleMessages});
  const mrWorldwideBoss=patchMrWorldwide(base,allocate,add,records,{uppercut:finaleAI.uppercut});
  const faygo=patchFaygo(base,allocate,add,records);
  const elements=patchElements(base,add);
  const techniqueRevision=patchTechniqueRevision(base,allocate,add);
  const nineLives=patchNineLives(base,allocate,add);
  const comboDescriptions=patchComboDescriptions(base,add);
  const effects=[],effectData=extendedCompressed?extendedCompressed.allocate:allocate;
  const bigEyesCharm=patchBigEyesCharm();
  const physicalTechEffects=patchCharacterEffects(base,allocate,add,effects,physicalEffectDefinitions,effectData);
  const comboTechEffects=patchCharacterEffects(base,allocate,add,effects,comboEffectDefinitions,effectData);
  const swampSpin=patchSwampSpin(base,allocate,add,effects);
  const eyeLasers=patchEyeLasers(base,allocate,add,effects);
  const swampBelch=patchSwampBelch(base,allocate,add,effectData);
  const techJuice=patchTechJuice(base,allocate,add,effectData);
  const ogreRoar=patchOgreRoar(base,add),stormBreath=patchStormBreath(base,add),getUp=patchGetUp(base,add),milk=patchMilk(base,allocate,add),techThemeAudit=patchTechThemes(base,allocate,add,{...Object.fromEntries(Object.entries(techThemes).map(([id,t])=>[id,t.theme])),35:'milk',38:'milk'},effectData);
  const yarnBomb=swampBelch.yarnBomb;
  const swampPiledriver=patchSwampPiledriver(base,allocate,add);
  const fourLayerSlam=patchFourLayerSlam(base,add,swampPiledriver.hooks[0]);
  const nativeTechEffects=patchNativeTechEffects(base,effects,allocate,add);
  const music=patchMusic(base,allocate,add);
  let npcGraphicsStreaming=null;
  if(extended){
    const graphics=[...streamedGraphics].sort((a,b)=>a-b);
    records.push(...extendedCompressed.records);
    const rawPools=extendedCompressed.pools.map(p=>({...p,next:Math.min(p.end,(p.next+31)&~31)}));
    const placement=placeNpcGraphicsStreams(base,records,[...allocations,...extendedCompressed.allocations],graphics,rawPools);
    records.push(...placement.records);
    npcGraphicsStreaming={...patchNpcGraphicsStreaming(base,placement.streams,allocate,add),bytes:placement.bytes,freeExtendedBytes:placement.freeBytes,pools:placement.pools};
  }
  for(const pool of reclaimedSprites)for(const id of pool.aliases){
    if(!records.some(r=>r.offset===pool.table+id*3&&r.bytes.length===3))throw Error('Reclaimed sprite still has an original pointer');
  }
  for(const pool of reclaimedPackets)if(!records.some(r=>r.offset===pool.pointer&&r.bytes.length===3))throw Error('Reclaimed packet still has an original pointer: '+pool.label);
  for(const pool of reclaimedMusic)if(!records.some(r=>r.offset===pool.pointer&&r.bytes.length===3))throw Error('Reclaimed music still has an original pointer');
  for(const pool of reclaimedDialogue)for(const id of pool.owners)if(!records.some(r=>r.offset===0x3cf9f0+id*3&&r.bytes.length===3))throw Error('Reclaimed dialogue still has an original event');
  allocator.finish();
  if(measure)return{spans:pools};
  add(0xffc0,new TextEncoder().encode('SHREK TRIGGER V0.1'.padEnd(21)),'cartridge header');
  const techHelp=repackTechHelp(base,records);
  const itemHelp=repackItemHelp(base,records),swampTerms=patchSwampTerms(base,add);
  const first=applyRecords(base,records.filter(r=>r.offset<HIROM_BYTES));
  const rom=extended?expandHirom(first,records.filter(r=>r.offset>=HIROM_BYTES)):first;
  const resources={romLimit:extended?EXHIROM_BYTES:HIROM_BYTES,executableRomLimit:HIROM_BYTES,extraVramBytes:0,extraWramBytes:0,allocatedBytes:allocations.reduce((n,a)=>n+a.length,0),freeReclaimedBytes:allocator.freeBytes,reclaimedEvents,reclaimedSprites,reclaimedPackets,reclaimedDialogue,maxTraceEntries:256};
  resources.reclaimedMusic=reclaimedMusic;
  resources.playerFramePacking=playerFramePacking;
  resources.playerGraphicsPlacement=playerGraphics.audit;
  resources.extendedPlayerGraphics=playerGraphics.extended;
  resources.playerGraphicsStreaming=playerGraphicsStreaming;
  resources.npcGraphicsStreaming=npcGraphicsStreaming;
  resources.extendedCompressedGraphics=extendedCompressed?{graphics:[...extendedCompressedIds],allocations:extendedCompressed.allocations,bytes:extendedCompressed.allocations.reduce((n,a)=>n+a.length,0)}:null;
  resources.sharedPlayerData=playerGraphics.sharedData;
  return {rom,records,audit:{techHelp,itemHelp,swampTerms,version:'1.0.0',baseSha256:BASE_SHA256,romBytes:rom.length,characters,portraits,title,credits,environment,supportingCast,guyFieri,carnival,courtBeasts,dulocTank,workshopPuppets,futureMachines,racing,guards,courtPalace,swampImps:impActors,townsfolk,storybook,futureWildlife,medinaActors,swampCreatures,bridgeActors,enforcers,ghosts,magicMirror,bakeryActors,dragon,cosmicMuffin,endgame,finale,tysonReveal,finaleAI,mrWorldwide:mrWorldwideBoss,faygo,elements,techniqueRevision,nineLives,comboDescriptions,callMyWife:swampBelch.callMyWife,techPictures:swampBelch.pictures,techJuice,bigEyesCharm,retainedBossNames,storyBattleNames,physicalTechEffects,comboTechEffects,swampSpin,eyeLasers,swampBelch,ogreRoar,stormBreath,getUp,milk,techThemes:techThemeAudit,yarnBomb,swampPiledriver,fourLayerSlam,nativeTechEffects,shrekDialogue,resurrection:{...eggChallenge,eventBytes:eventAudit.find(e=>e.location===eggChallenge.location).eventBytes,eventCapacity:0x1700,extraWramBytes:0,extraVramBytes:0},music,resources,techs:techs.length,items:items.length,events:eventAudit,allocations,dialogues:eventAudit.reduce((a,b)=>a+b.dialogues,0),native:true,hardwareTested:false}};
}
function BufferCompare(a,b){return a.length===b.length&&a.every((v,i)=>v===b[i])?0:1;}
