type Loot = {
    name: string;
    quantity: number;
    metadata: Record<string, any>;
};

const lootTables: Array<Loot[]> = [
    [
        { name: 'pistol', quantity: 1, metadata: {} }
    ],
    [
        { name: 'money', quantity: 200, metadata: {} },
        { name: 'knife', quantity: 1, metadata: {} }
    ]
];

onNet('npc_robbery:server:giveReward', async () => {
    const src = global.source;
    const character = await exports['pxj-core'].getCharacterFromId(src);
    if (!character) return;

    const index = Math.floor(Math.random() * lootTables.length);
    const items = lootTables[index];

    items.forEach(obj => {
        exports['x-inventory']['AddInventoryItem'](character, {
            Item: {
                Name: obj.name,
                Count: obj.quantity,
                MetaData: obj.metadata
            },
            Inventory: `POCKETS_${character.socialnumber}`
        })
    })
})