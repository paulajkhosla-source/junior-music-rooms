'use client';
export function ConfirmDelete(){return <button name="operation" value="deleteWeek" onClick={e=>{if(!window.confirm('Delete this week and all its changes?'))e.preventDefault()}}>Delete</button>}
