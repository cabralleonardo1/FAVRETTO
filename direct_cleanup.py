#!/usr/bin/env python3
"""
Limpeza direta no banco de dados MongoDB
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def cleanup_database():
    """Limpar dados de teste diretamente no MongoDB"""
    
    # Conectar ao MongoDB
    mongo_url = "mongodb://localhost:27017"
    client = AsyncIOMotorClient(mongo_url)
    db = client.test_database
    
    print("🧹 LIMPEZA DIRETA NO BANCO DE DADOS")
    print("=" * 50)
    
    try:
        # 1. Contar registros antes
        clients_count = await db.clients.count_documents({})
        budgets_count = await db.budgets.count_documents({})
        audit_logs_count = await db.audit_logs.count_documents({})
        
        print(f"📊 ANTES DA LIMPEZA:")
        print(f"   - Clientes: {clients_count}")
        print(f"   - Orçamentos: {budgets_count}")
        print(f"   - Logs de auditoria: {audit_logs_count}")
        
        # 2. Excluir todos os orçamentos primeiro (devido às dependências)
        print(f"\n🗑️  Excluindo orçamentos...")
        budgets_result = await db.budgets.delete_many({})
        print(f"   ✅ {budgets_result.deleted_count} orçamentos excluídos")
        
        # 3. Excluir todos os clientes
        print(f"\n🗑️  Excluindo clientes...")
        clients_result = await db.clients.delete_many({})
        print(f"   ✅ {clients_result.deleted_count} clientes excluídos")
        
        # 4. Opcionalmente, limpar logs de auditoria antigos (manter os recentes)
        print(f"\n🗑️  Limpando logs de auditoria antigos...")
        # Manter apenas os últimos 100 logs
        logs_to_keep = await db.audit_logs.find().sort("created_at", -1).limit(100).to_list(100)
        if logs_to_keep:
            keep_ids = [log["_id"] for log in logs_to_keep]
            audit_result = await db.audit_logs.delete_many({"_id": {"$nin": keep_ids}})
            print(f"   ✅ {audit_result.deleted_count} logs antigos excluídos (mantidos 100 recentes)")
        else:
            print("   ℹ️  Nenhum log para limpar")
        
        # 5. Contar registros depois
        clients_count_after = await db.clients.count_documents({})
        budgets_count_after = await db.budgets.count_documents({})
        audit_logs_count_after = await db.audit_logs.count_documents({})
        
        print(f"\n📊 APÓS A LIMPEZA:")
        print(f"   - Clientes: {clients_count_after}")
        print(f"   - Orçamentos: {budgets_count_after}")
        print(f"   - Logs de auditoria: {audit_logs_count_after}")
        
        # 6. Resultado
        if clients_count_after == 0 and budgets_count_after == 0:
            print(f"\n🎉 LIMPEZA CONCLUÍDA COM SUCESSO!")
            print(f"   - {clients_result.deleted_count} clientes removidos")
            print(f"   - {budgets_result.deleted_count} orçamentos removidos")
            return True
        else:
            print(f"\n⚠️  Limpeza parcial - alguns registros podem ter permanecido")
            return False
            
    except Exception as e:
        print(f"\n❌ Erro durante limpeza: {e}")
        return False
    finally:
        client.close()

if __name__ == "__main__":
    success = asyncio.run(cleanup_database())
    if success:
        print("\n✅ Operação concluída com sucesso!")
    else:
        print("\n❌ Operação concluída com problemas.")