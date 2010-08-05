package com.google.gridworks.protograph;

import java.util.LinkedList;
import java.util.List;
import java.util.Properties;

import org.json.JSONException;
import org.json.JSONWriter;

public class CellTopicNode extends CellNode implements NodeWithLinks {
    final public FreebaseType   type;
    final public List<Link>     links = new LinkedList<Link>();

    public CellTopicNode(
        FreebaseType type
    ) {
        this.type = type;
    }
    
    public void write(JSONWriter writer, Properties options)
        throws JSONException {

        writer.object();
        writer.key("nodeType"); writer.value("cell-as-topic");
        writer.key("columnNames");
        writer.array();
        for (String name : columnNames) {
            writer.value(name);
        }
        writer.endArray();
        if (type != null) {
            writer.key("type"); type.write(writer, options);
        }
        if (links != null) {
            writer.key("links"); writer.array();
            for (Link link : links) {
                link.write(writer, options);
            }
            writer.endArray();
        }
        
        writer.endObject();
    }

    public void addLink(Link link) {
        links.add(link);
    }

    public Link getLink(int index) {
        return links.get(index);
    }

    public int getLinkCount() {
        return links.size();
    }
}
