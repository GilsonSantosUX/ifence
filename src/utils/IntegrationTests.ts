import { dbService, type Geofence } from '../services/DatabaseService';

export async function runIntegrationTests() {
    console.group('Iniciando Testes de Integração');
    const results: string[] = [];

    try {
        // 1. Test Database Operations
        console.log('Testando DatabaseService...');
        
        // Add a test fence
        const testFence: Omit<Geofence, 'id'> = {
            name: 'Test Fence',
            color: '#000000',
            status: 'active',
            createdAt: new Date().toISOString()
        };
        
        const fenceId = await dbService.addFence(testFence);
        if (!fenceId) throw new Error('Falha ao adicionar cerca de teste');
        console.log('✅ addFence passou');

        // Retrieve fence
        const fences = await dbService.getFences();
        const retrieved = fences.find(f => f.id === fenceId);
        if (!retrieved || retrieved.name !== 'Test Fence') throw new Error('Falha ao recuperar cerca de teste');
        console.log('✅ getFences passou');

        // Update fence
        await dbService.updateFence({ ...retrieved, name: 'Updated Fence' });
        const updatedFences = await dbService.getFences();
        const updated = updatedFences.find(f => f.id === fenceId);
        if (updated?.name !== 'Updated Fence') throw new Error('Falha ao atualizar cerca de teste');
        console.log('✅ updateFence passou');

        // 2. Test Export/Import Logic
        console.log('Testando Export/Import...');
        const exportData = await dbService.exportDatabase();
        if (!exportData || !exportData.stores || !exportData.stores.fences) throw new Error('Falha na estrutura de exportação');
        console.log('✅ exportDatabase passou');

        // 3. Test Clear Logic (Mocked to avoid destroying real data during simple test, or use with caution)
        // We will skip actual clear/import in this safe test suite to not wipe user data unexpectedly.
        // Instead, we verify the methods exist.
        if (typeof dbService.clearDatabase !== 'function') throw new Error('Método clearDatabase ausente');
        if (typeof dbService.importDatabase !== 'function') throw new Error('Método importDatabase ausente');
        console.log('✅ Métodos de gerenciamento de dados existem');

        // Clean up test data
        await dbService.deleteFence(fenceId);
        const finalFences = await dbService.getFences();
        if (finalFences.find(f => f.id === fenceId)) throw new Error('Falha ao deletar cerca de teste');
        console.log('✅ deleteFence passou');

        results.push('Todos os testes de banco de dados passaram com sucesso!');

    } catch (error) {
        console.error('Teste falhou:', error);
        results.push(`FALHA: ${(error as Error).message}`);
    } finally {
        console.groupEnd();
    }

    return results;
}
