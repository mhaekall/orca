
file_path = "scripts/ingest_pending.py"
with open(file_path) as f:
    content = f.read()

content = content.replace(
    """    asyncio.run(ingest_pending(args.limit, anilist_id=args.anilist_id, ep_num=args.ep_num))
_pending(args.limit, anilist_id=args.anilist_id, ep_num=args.ep_num))
ding(args.limit, anilist_id=args.anilist_id, ep_num=args.ep_num))""",
    """    asyncio.run(ingest_pending(args.limit, anilist_id=args.anilist_id, ep_num=args.ep_num))""",
)

content = content.replace(
    """    asyncio.run(ingest_pending(args.limit, anilist_id=args.anilist_id, ep_num=args.ep_num))
_pending(args.limit, anilist_id=args.anilist_id, ep_num=args.ep_num))""",
    """    asyncio.run(ingest_pending(args.limit, anilist_id=args.anilist_id, ep_num=args.ep_num))""",
)

with open(file_path, "w") as f:
    f.write(content)
