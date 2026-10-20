/* Legacy Derby presentation adapter. Model generation/settlement remain untouched. */
(()=>{
 const originalRender=render;
 render=function(options={}){
  originalRender(options);
  if(currentGame!=='slot')return;
  if(!options.enter&&!options.enterCells?.size&&!options.fallMap?.size)return;
  const cells=[],staticScatterColumns=[],all=[...gridEl.children];let staticScatters=0;
  for(let r=0;r<state.size;r++)for(let c=0;c<state.size;c++){
   const position=key(r,c),node=all[r*state.size+c],symbol=state.grid[r][c];
   const enters=!state.sticky.has(position)&&(options.enter||options.enterCells?.has(position)),falls=options.fallMap?.get(position);
   if(symbol==='scatter'&&!enters){staticScatters++;staticScatterColumns.push(c);}
   if(!symbol||!enters&&!falls)continue;
   node.classList.remove('enter','falling');cells.push({node,column:c,row:r,symbol,fromRows:falls||undefined});
  }
  VaultSymbolDrop.play('slot',{root:gridEl,cells,rows:state.size,phase:options.enterCells?.size?'cascade':options.fallMap?.size?'gravity':'initial',staticScatters,staticScatterColumns,hasWin:findWins().length>0,settle:!options.fallMap?.size,speedProfile:currentFastMode()?'quick':'normal',roundId:window.VaultRoundService?.get('slot')?.roundId});
 };
})();
