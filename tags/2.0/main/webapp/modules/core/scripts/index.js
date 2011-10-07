/*

Copyright 2010, Google Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

    * Redistributions of source code must retain the above copyright
notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above
copyright notice, this list of conditions and the following disclaimer
in the documentation and/or other materials provided with the
distribution.
    * Neither the name of Google Inc. nor the names of its
contributors may be used to endorse or promote products derived from
this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,           
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY           
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/

function onClickUploadFileButton(evt) {
    var projectName = $("#project-name-input")[0].value;
    var dataURL = $.trim($("#project-url-input")[0].value);
    if (! $.trim(projectName).length) {
        window.alert("You must specify a project name.");

    } else if ($("#project-file-input")[0].files.length === 0 && ! dataURL.length) {
        window.alert("You must specify a data file to upload or a URL to retrieve.");

    } else {
        $("#file-upload-form").attr("action",
            "/command/core/create-project-from-upload?" + [
                "url=" +                escape(dataURL),
                "split-into-columns=" + $("#split-into-columns-input")[0].checked,
                "separator=" +          $("#separator-input")[0].value,
                "ignore=" +             $("#ignore-input")[0].value,
                "header-lines=" +       $("#header-lines-input")[0].value,
                "skip=" +               $("#skip-input")[0].value,
                "limit=" +              $("#limit-input")[0].value,
                "guess-value-type=" +   $("#guess-value-type-input")[0].checked,
                "ignore-quotes=" +      $("#ignore-quotes-input")[0].checked
            ].join("&"));

        return true;
    }

    evt.preventDefault();
    return false;
}

function formatDate(d) {
    var d = new Date(d);
    var last_year = Date.today().add({ years: -1 });
    var last_month = Date.today().add({ months: -1 });
    var last_week = Date.today().add({ days: -7 });
    var today = Date.today();
    var tomorrow = Date.today().add({ days: 1 });

    if (d.between(today, tomorrow)) {
        return "today " + d.toString("h:mm tt");
    } else if (d.between(last_week, today)) {
        var diff = Math.floor(today.getDayOfYear() - d.getDayOfYear());
        return (diff <= 1) ? ("yesterday " + d.toString("h:mm tt")) : (diff + " days ago");
    } else if (d.between(last_month, today)) {
        var diff = Math.floor((today.getDayOfYear() - d.getDayOfYear()) / 7);
        return (diff == 1) ? "a week ago" : diff.toFixed(0) + " weeks ago" ;
    } else if (d.between(last_year, today)) {
        var diff = Math.floor(today.getMonth() - d.getMonth());
        return (diff == 1) ? "a month ago" : diff + " months ago";
    } else {
        var diff = Math.floor(today.getYear() - d.getYear());
        return (diff == 1) ? "a year ago" : diff + " years ago";
    }
}

function isThereNewRelease() {
    var thisRevision = GoogleRefineVersion.revision;

    var revision_pattern = /r([0-9]+)/;

    if (!revision_pattern.test(thisRevision)) { // probably "trunk"
        return false;
    }

    var latestRevision = GoogleRefineReleases.releases[0].revision;

    var thisRev = parseInt(revision_pattern.exec(thisRevision)[1],10);
    var latestRev = parseInt(revision_pattern.exec(GoogleRefineReleases.releases[0].revision)[1],10);

    return latestRev > thisRev;
}

function fetchProjects() {
    $.getJSON(
        "/command/core/get-all-project-metadata",
        null,
        function(data) {
            renderProjects(data);
        },
        "json"
    );
}

function renderProjects(data) {
    var projects = [];
    for (var n in data.projects) {
        if (data.projects.hasOwnProperty(n)) {
            var project = data.projects[n];
            project.id = n;
            project.date = Date.parseExact(project.modified, "yyyy-MM-ddTHH:mm:ssZ");
            projects.push(project);
        }
    }
    projects.sort(function(a, b) { return b.date.getTime() - a.date.getTime(); });

    var container = $("#projects-container").empty();
    if (!projects.length) {
        $("#no-project-message").clone().show().appendTo(container);
    } else {
        var table = $(
            '<table class="list-table"><tr>' +
                '<th>Name</th>' +
                '<th></th>' +
                '<th></th>' +
                '<th align="right">Last&nbsp;modified</th>' +
            '</tr></table>'
        ).appendTo(container)[0];

        var renderProject = function(project) {
            var tr = table.insertRow(table.rows.length);
            tr.className = "project";

            var nameLink = $('<a></a>')
                .addClass("list-table-itemname")
                .text(project.name)
                .attr("href", "/project?project=" + project.id)
                .appendTo(tr.insertCell(tr.cells.length));

            var renameLink = $('<a></a>')
                .text("rename")
                .addClass("secondary")
                .attr("href", "javascript:{}")
                .css("visibility", "hidden")
                .click(function() {
                    var name = window.prompt("New project name:", project.name);
                    if (name == null) {
                        return;
                    }

                    name = $.trim(name);
                    if (project.name == name || name.length == 0) {
                        return;
                    }

                    $.ajax({
                        type: "POST",
                        url: "/command/core/rename-project",
                        data: { "project" : project.id, "name" : name },
                        dataType: "json",
                        success: function (data) {
                            if (data && typeof data.code != 'undefined' && data.code == "ok") {
                                nameLink.text(name);
                            } else {
                                alert("Failed to rename project: " + data.message)
                            }
                        }
                    });
                }).appendTo(tr.insertCell(tr.cells.length));

            var deleteLink = $('<a></a>')
                .addClass("delete-project")
                .attr("title","Delete this project")
                .attr("href","")
                .css("visibility", "hidden")                
                .html("<img src='/images/close.png' />")
                .click(function() {
                    if (window.confirm("Are you sure you want to delete project \"" + project.name + "\"?")) {
                        $.ajax({
                            type: "POST",
                            url: "/command/core/delete-project",
                            data: { "project" : project.id },
                            dataType: "json",
                            success: function (data) {
                                if (data && typeof data.code != 'undefined' && data.code == "ok") {
                                    fetchProjects();
                                }
                            }
                        });
                    }
                    return false;
                }).appendTo(tr.insertCell(tr.cells.length));


            $('<div></div>')
                .html(formatDate(project.date))
                .addClass("last-modified")
                .attr("title", project.date.toString())
                .appendTo(tr.insertCell(tr.cells.length));

            $(tr).mouseenter(function() {
                renameLink.css("visibility", "visible");
                deleteLink.css("visibility", "visible");
            }).mouseleave(function() {
                renameLink.css("visibility", "hidden");
                deleteLink.css("visibility", "hidden");
            });
        };

        for (var i = 0; i < projects.length; i++) {
            renderProject(projects[i]);
        }
    }
}

function showHide(toHide, toShow) {
    $("#" + toHide).hide();
    $("#" + toShow).show();
}

function openWorkspaceDir() {
    $.ajax({
        type: "POST",
        url: "/command/core/open-workspace-dir",
        dataType: "json",
        success: function (data) {
            if (data.code != "ok" && "message" in data) {
                alert(data.message);
            }
        }
    });
}

var GoogleRefineVersion;
function showVersion() {
    $.getJSON(
        "/command/core/get-version",
        null,
        function(data) {
            GoogleRefineVersion = data;
            
            $("#google-refine-version").text("Version " + GoogleRefineVersion.full_version);
            
            var script = $('<script></script>')
                .attr("src", "http://google-refine.googlecode.com/svn/support/releases.js")
                .attr("type", "text/javascript")
                .appendTo(document.body);

            var poll = function() {
                if ("releases" in window) {
                    if (isThereNewRelease()) {
                        var container = $('<div id="notification-container">')
                            .appendTo(document.body)
                        var notification = $('<div id="notification">')
                            .text('New version! ')
                            .appendTo(container)
                        $('<a>')
                            .addClass('notification-action')
                            .attr("href", releases.homepage)
                            .text('Download ' + releases.releases[0].description + ' now.')
                            .appendTo(notification);
                    }
                } else {
                    window.setTimeout(poll, 1000);
                }
            };
            window.setTimeout(poll, 1000);            
        }
    );
}

function onLoad() {
    fetchProjects();
    
    $("#project-file-input").change(function() {
        if ($("#project-name-input")[0].value.length == 0) {
            var fileName = this.files[0].fileName;
            if (fileName) {
                $("#project-name-input")[0].value = fileName.replace(/\.\w+/, "").replace(/[_-]/g, " ");
            }
            $("#project-name-input").focus().select();
        }
    }).keypress(function(evt) {
        if (evt.keyCode == 13) {
            onClickUploadFileButton();
        }
    });
    
    $("#upload-file-button").click(onClickUploadFileButton);
    $("#more-options-link").click(function() {
        $("#more-options-controls").hide();
        $("#more-options").show();
    });
    
    showVersion();
}

$(onLoad);